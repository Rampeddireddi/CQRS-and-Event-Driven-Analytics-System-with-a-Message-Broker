const pool = require("./db");
const { connectRabbit } = require("./rabbit");

async function alreadyProcessed(eventId) {
  const r = await pool.query(
    `SELECT 1 FROM processed_events WHERE event_id=$1`,
    [eventId]
  );
  return r.rowCount > 0;
}

async function markProcessed(eventId) {
  await pool.query(
    `INSERT INTO processed_events(event_id) VALUES($1)
     ON CONFLICT(event_id) DO NOTHING`,
    [eventId]
  );
}

/* ===============================
   PRODUCT CREATED → replicate product into read DB
================================ */
async function processProductCreated(event) {
  const { productId, name, category, price } = event;

  await pool.query(`
    INSERT INTO products(id,name,category,price)
    VALUES($1,$2,$3,$4)
    ON CONFLICT(id) DO NOTHING
  `, [productId, name, category, price]);
}

/* ===============================
   ORDER CREATED → update projections
================================ */
async function processOrderCreated(event) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { customerId, items, total, timestamp } = event;

    for (const item of items) {
      const revenue = item.quantity * item.price;

      /* 🔎 fetch category from replicated products table */
      // 1️⃣ try read DB first
let prod = await client.query(
  `SELECT category FROM products WHERE id=$1`,
  [item.productId]
);

let category = prod.rows[0]?.category;

// 2️⃣ fallback → query write DB if missing
if (!category) {
  const writePool = require("./writeDb"); // new file (explained below)

  const w = await writePool.query(
    `SELECT category FROM products WHERE id=$1`,
    [item.productId]
  );

  category = w.rows[0]?.category;

  // also replicate into read DB so next time fast
  if (category) {
    await client.query(
      `INSERT INTO products(id,category) VALUES($1,$2)
       ON CONFLICT(id) DO UPDATE SET category=EXCLUDED.category`,
      [item.productId, category]
    );
  }
}

      /* product sales view */
      await client.query(`
        INSERT INTO product_sales_view(product_id,total_quantity_sold,total_revenue,order_count)
        VALUES($1,$2,$3,1)
        ON CONFLICT(product_id)
        DO UPDATE SET
          total_quantity_sold = product_sales_view.total_quantity_sold + EXCLUDED.total_quantity_sold,
          total_revenue = product_sales_view.total_revenue + EXCLUDED.total_revenue,
          order_count = product_sales_view.order_count + 1
      `, [item.productId, item.quantity, revenue]);

      /* category metrics */
      if (category) {
        await client.query(`
          INSERT INTO category_metrics_view(category_name,total_revenue,total_orders)
          VALUES($1,$2,1)
          ON CONFLICT(category_name)
          DO UPDATE SET
            total_revenue = category_metrics_view.total_revenue + EXCLUDED.total_revenue,
            total_orders = category_metrics_view.total_orders + 1
        `, [category, revenue]);
      }
    }

    /* customer LTV */
    await client.query(`
      INSERT INTO customer_ltv_view(customer_id,total_spent,order_count,last_order_date)
      VALUES($1,$2,1,$3)
      ON CONFLICT(customer_id)
      DO UPDATE SET
        total_spent = customer_ltv_view.total_spent + EXCLUDED.total_spent,
        order_count = customer_ltv_view.order_count + 1,
        last_order_date = EXCLUDED.last_order_date
    `, [customerId, total, timestamp]);

    /* hourly sales */
    const hour = new Date(timestamp);
    hour.setMinutes(0,0,0);

    await client.query(`
      INSERT INTO hourly_sales_view(hour_timestamp,total_orders,total_revenue)
      VALUES($1,1,$2)
      ON CONFLICT(hour_timestamp)
      DO UPDATE SET
        total_orders = hourly_sales_view.total_orders + 1,
        total_revenue = hourly_sales_view.total_revenue + EXCLUDED.total_revenue
    `, [hour, total]);

    /* sync status */
    await client.query(
      `UPDATE sync_status SET last_processed_event_timestamp=$1 WHERE id=1`,
      [timestamp]
    );

    await client.query("COMMIT");

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Consumer error", e);
  } finally {
    client.release();
  }
}

/* ===============================
   Start consumer
================================ */
async function start() {
  const { channel, queue } = await connectRabbit();

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const eventId = event.eventId || JSON.stringify(event);

      if (await alreadyProcessed(eventId)) {
        channel.ack(msg);
        return;
      }

      if (event.eventType === "ProductCreated") {
        await processProductCreated(event);
      }

      if (event.eventType === "OrderCreated") {
        await processOrderCreated(event);
      }

      await markProcessed(eventId);
      channel.ack(msg);

    } catch (err) {
      console.error("Consume error", err);
      channel.ack(msg); // avoid poison loop
    }
  });

  console.log("Consumer waiting for messages...");
}

start();