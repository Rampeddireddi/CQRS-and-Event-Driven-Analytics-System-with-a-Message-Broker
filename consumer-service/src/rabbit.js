const amqp = require("amqplib");

const ORDER_QUEUE = "order-events";

async function connectRabbit() {
  const conn = await amqp.connect(process.env.BROKER_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(ORDER_QUEUE, { durable: true });

  console.log("Consumer connected to Rabbit");

  return { channel, queue: ORDER_QUEUE };
}

module.exports = { connectRabbit };