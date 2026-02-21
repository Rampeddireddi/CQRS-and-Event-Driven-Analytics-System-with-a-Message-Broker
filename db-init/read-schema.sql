CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT,
  category TEXT,
  price NUMERIC
);

CREATE TABLE IF NOT EXISTS product_sales_view (
  product_id INTEGER PRIMARY KEY,
  total_quantity_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS category_metrics_view (
  category_name TEXT PRIMARY KEY,
  total_revenue NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customer_ltv_view (
  customer_id INTEGER PRIMARY KEY,
  total_spent NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_order_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hourly_sales_view (
  hour_timestamp TIMESTAMP PRIMARY KEY,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_processed_event_timestamp TIMESTAMP
);

INSERT INTO sync_status(id,last_processed_event_timestamp)
VALUES(1,NULL)
ON CONFLICT (id) DO NOTHING;
