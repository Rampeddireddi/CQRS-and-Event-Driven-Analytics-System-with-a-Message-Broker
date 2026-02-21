const express = require("express");
const pool = require("./db");

const app = express();

app.get("/health", (_, res) => res.send("OK"));

app.get("/api/analytics/products/:productId/sales", async (req, res) => {
  const { productId } = req.params;

  const r = await pool.query(
    `SELECT * FROM product_sales_view WHERE product_id=$1`,
    [productId]
  );

  const row = r.rows[0] || {
    product_id: productId,
    total_quantity_sold: 0,
    total_revenue: 0,
    order_count: 0
  };

  res.json({
    productId: Number(row.product_id),
    totalQuantitySold: Number(row.total_quantity_sold),
    totalRevenue: Number(row.total_revenue),
    orderCount: Number(row.order_count)
  });
});

app.get("/api/analytics/categories/:category/revenue", async (req, res) => {
  const { category } = req.params;

  const r = await pool.query(
    `SELECT * FROM category_metrics_view WHERE category_name=$1`,
    [category]
  );

  const row = r.rows[0] || {
    category_name: category,
    total_revenue: 0,
    total_orders: 0
  };

  res.json({
    category,
    totalRevenue: Number(row.total_revenue),
    totalOrders: Number(row.total_orders)
  });
});

app.get("/api/analytics/customers/:customerId/lifetime-value", async (req, res) => {
  const { customerId } = req.params;

  const r = await pool.query(
    `SELECT * FROM customer_ltv_view WHERE customer_id=$1`,
    [customerId]
  );

  const row = r.rows[0] || {
    customer_id: customerId,
    total_spent: 0,
    order_count: 0,
    last_order_date: null
  };

  res.json({
    customerId: Number(row.customer_id),
    totalSpent: Number(row.total_spent),
    orderCount: Number(row.order_count),
    lastOrderDate: row.last_order_date
  });
});

app.get("/api/analytics/sync-status", async (_, res) => {
  const r = await pool.query(`SELECT * FROM sync_status WHERE id=1`);
  const row = r.rows[0];

  if (!row || !row.last_processed_event_timestamp) {
    return res.json({
      lastProcessedEventTimestamp: null,
      lagSeconds: null
    });
  }

  const lag =
    (Date.now() - new Date(row.last_processed_event_timestamp).getTime()) / 1000;

  res.json({
    lastProcessedEventTimestamp: row.last_processed_event_timestamp,
    lagSeconds: Math.floor(lag)
  });
});

app.listen(8081, () => console.log("Query Service running"));