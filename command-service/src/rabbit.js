const amqp = require("amqplib");

let channel;
const ORDER_QUEUE = "order-events";
const PRODUCT_QUEUE = "product-events";

async function connectRabbit() {
  const conn = await amqp.connect(process.env.BROKER_URL);
  channel = await conn.createChannel();

  await channel.assertQueue(ORDER_QUEUE, { durable: true });
  await channel.assertQueue(PRODUCT_QUEUE, { durable: true });

  console.log("RabbitMQ connected");
}

function getChannel() {
  if (!channel) throw new Error("Rabbit not connected");
  return channel;
}

module.exports = { connectRabbit, getChannel, ORDER_QUEUE, PRODUCT_QUEUE };