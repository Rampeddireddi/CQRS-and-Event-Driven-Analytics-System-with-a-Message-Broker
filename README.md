# CQRS Event-Driven E-commerce Analytics System

A fully containerized **CQRS + Event-Driven analytics system** built with **Node.js, Express, PostgreSQL, RabbitMQ and Docker**.

This project demonstrates how modern backend systems separate **write models (commands)** from **read models (queries)** and use an **event-driven architecture with the transactional outbox pattern** to keep them synchronized.

---

##  Features

* CQRS architecture (Command + Query separation)
* Transactional Outbox Pattern (reliable event publishing)
* RabbitMQ message broker
* Event-driven projections (consumer updates analytics views)
* Materialized analytics views
* Sync lag monitoring endpoint
* Fully containerized with Docker Compose
* Health checks for all services

---

## Concepts & Topics Learned (Revision Checklist)

This project covers many real backend architecture topics:

### Architecture

* CQRS (Command Query Responsibility Segregation)
* Event-Driven Architecture
* Eventual Consistency
* Read model projections
* Distributed system design basics

### Messaging & Reliability

* RabbitMQ fundamentals
* Queue-based messaging
* Idempotent consumers
* Transactional Outbox Pattern
* Exactly-once vs At-least-once delivery

### Backend Engineering

* REST API design
* Service boundaries
* Database normalization vs denormalization
* Aggregations & analytics modeling
* Health checks

### Databases

* PostgreSQL transactions
* Materialized views / projection tables
* Write DB vs Read DB separation
* Upserts (`ON CONFLICT`)

### DevOps / Infra

* Docker multi-service setup
* docker-compose orchestration
* Environment configuration
* Container health checks

This list is extremely useful for interviews revision.

---

##  High Level Architecture

```
Client
  → Command Service (write DB)
  → Outbox table
  → Outbox publisher
  → RabbitMQ queue
  → Consumer service
  → Read DB projections
  → Query Service (analytics APIs)
```

---

##  Request Flow (Step-by-Step)

### Create Product

1. Client calls Command Service.
2. Product stored in write database.
3. ProductCreated event written to outbox.
4. Outbox worker publishes event to RabbitMQ.
5. Consumer replicates product into read DB.

### Create Order

1. Order stored in write DB.
2. OrderCreated event stored in outbox.
3. Event published to RabbitMQ.
4. Consumer updates:

   * product_sales_view
   * category_metrics_view
   * customer_ltv_view
   * hourly_sales_view
   * sync_status

### Query Analytics

Query service reads projections directly from read DB (fast reads).

---

##  Project Structure

```
root
 ├─ command-service
 │   ├─ src
 │   │   ├─ index.js
 │   │   ├─ db.js
 │   │   ├─ rabbit.js
 │   │   └─ outboxPublisher.js
 │   └─ Dockerfile
 │
 ├─ consumer-service
 │   ├─ src
 │   │   ├─ index.js
 │   │   ├─ db.js and // write_db as fallback too
 │   │   └─ rabbit.js
 │   └─ Dockerfile
 │
 ├─ query-service
 │   ├─ src
 │   │   ├─ index.js
 │   │   └─ db.js
 │   └─ Dockerfile
 │
 ├─ docker-compose.yml
 ├─ .env.example
 └─ submission.json
```

---

## Services Overview

### Command Service

* Handles writes (products, orders)
* Writes events to outbox
* Runs outbox publisher worker

### Consumer Service

* Consumes events from RabbitMQ
* Maintains read projections
* Ensures idempotency

### Query Service

* Provides analytics endpoints
* Reads only from read DB

### Databases

* write_db → normalized transactional data
* read_db → denormalized analytics projections

### Broker

* RabbitMQ queue for events

---

## nalytics Implemented

* Product sales analytics
* Category revenue analytics
* Customer lifetime value (LTV)
* Hourly sales aggregation
* Sync lag monitoring

---

##  API Endpoints

### Command Service (8080)

* `POST /api/products`
* `POST /api/orders`

### Query Service (8081)

* `GET /api/analytics/products/{id}/sales`
* `GET /api/analytics/categories/{category}/revenue`
* `GET /api/analytics/customers/{id}/lifetime-value`
* `GET /api/analytics/sync-status`

---

##  How This Works in Real Projects

This architecture is widely used in:

* E-commerce platforms
* Analytics pipelines
* Payment systems
* High-scale SaaS products
* Event streaming platforms

Real systems use:

* Kafka instead of RabbitMQ
* Multiple consumers
* Schema registry
* Event versioning
* Data lake / warehouse
* Stream processing (Flink / Spark)

But the core idea remains identical.

---

##  Why Companies Use This Architecture

* Fast read performance
* Independent scaling
* Clear service boundaries
* Reliable event publishing
* Better analytics pipelines
* Decoupled services

Trade-off:
 More complexity + storage duplication

---

##  Challenges (Real World)

* Event ordering issues
* Idempotency
* Schema evolution
* Backfills & reprocessing
* Debugging async flows
* Monitoring lag

This project demonstrates these real challenges.

---

##  Setup Instructions

### Prerequisites

* Docker
* Docker Compose

### 1. Clone repository

```
git clone <repo>
cd <repo>
```

### 2. Create environment file

```
cp .env.example .env
```

### 3. Start system

```
docker compose up --build
```

All services should become healthy within ~3 minutes.

---

##  Test Example

Create product:

```
curl -X POST http://localhost:8080/api/products \
-H "Content-Type: application/json" \
-d '{"name":"MacBook","category":"electronics","price":2000,"stock":10}'
```

Create order:

```
curl -X POST http://localhost:8080/api/orders \
-H "Content-Type: application/json" \
-d '{"customerId":101,"items":[{"productId":1,"quantity":2,"price":2000}]}'
```

Check analytics:

```
curl http://localhost:8081/api/analytics/products/1/sales
```

---

## What This Project Demonstrates

* Production-style backend architecture
* Reliable event publishing
* Real analytics modeling
* Distributed system thinking
* CQRS in practice

---

##  Learning Outcome

After this project you should understand:

* When to use CQRS
* How event-driven systems work
* How analytics pipelines are built
* How to design projection models
* How real microservices communicate

---

## Future Improvements

* Kafka instead of RabbitMQ
* Event versioning
* Retry & DLQ
* Distributed tracing
* Monitoring dashboards
* Multiple consumers
* Streaming analytics

---

Built as part of backend architecture learning focused on CQRS and event-driven analytics.
