const express = require("express");
const pool = require("./db");
const { connectRabbit, ORDER_QUEUE, PRODUCT_QUEUE } = require("./rabbit");
const { startOutboxWorker } = require("./outboxPublisher");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.send("OK"));

/**
 * CREATE PRODUCT
 */
app.post("/api/products", async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    const result = await pool.query(
      `INSERT INTO products(name,category,price,stock)
       VALUES($1,$2,$3,$4) RETURNING id`,
      [name, category, price, stock]
    );

    const productId = result.rows[0].id;

    await pool.query(
      `INSERT INTO outbox(id,topic,payload)
       VALUES($1,$2,$3)`,
      [
        randomUUID(),
        PRODUCT_QUEUE,
        {
          eventId: randomUUID(),
          eventType: "ProductCreated",
          productId,
          name,
          category,
          price,
          stock,
          timestamp: new Date()
        }
      ]
    );

    res.status(201).json({ productId });

  } catch (e) {
    console.error(e);
    res.status(500).send("Error creating product");
  }
});

/**
 * CREATE ORDER
 */
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    const { customerId, items } = req.body;

    await client.query("BEGIN");

    const total = items.reduce(
      (s, i) => s + i.price * i.quantity,
      0
    );

    const orderRes = await client.query(
      `INSERT INTO orders(customer_id,total,status)
       VALUES($1,$2,$3) RETURNING id`,
      [customerId, total, "CREATED"]
    );

    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items(order_id,product_id,quantity,price)
         VALUES($1,$2,$3,$4)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    await client.query(
      `INSERT INTO outbox(id,topic,payload)
       VALUES($1,$2,$3)`,
      [
        randomUUID(),
        ORDER_QUEUE,
        {
          eventId: randomUUID(),
          eventType: "OrderCreated",
          orderId,
          customerId,
          items,
          total,
          timestamp: new Date()
        }
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({ orderId });

  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).send("Error creating order");
  } finally {
    client.release();
  }
});

app.listen(8080, async () => {
  console.log("Command Service running");

  await connectRabbit();
  startOutboxWorker();
});