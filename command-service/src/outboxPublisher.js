const pool = require("./db");
const { getChannel } = require("./rabbit");

async function publishOutbox() {
  try {
    const channel = getChannel();

    const res = await pool.query(`
      SELECT * FROM outbox
      WHERE published_at IS NULL
      ORDER BY created_at
      LIMIT 20
    `);

    for (const row of res.rows) {
      const payload = row.payload;

      await channel.assertQueue(row.topic, { durable: true });

      channel.sendToQueue(
        row.topic,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );

      await pool.query(
        `UPDATE outbox SET published_at = NOW() WHERE id=$1`,
        [row.id]
      );
    }

  } catch (e) {
    console.error("Outbox publisher error", e);
  }
}

function startOutboxWorker() {
  setInterval(publishOutbox, 2000);
}

module.exports = { startOutboxWorker };