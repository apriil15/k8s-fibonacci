const redis = require("redis");
const keys = require("./keys");

work();

async function work() {
  const redisClient = await getRedisClient();

  const subscriber = redisClient.duplicate();

  await subscriber.connect();

  subscriber.subscribe("insert", (message) => {
    console.log("subscriber is working");
    redisClient.hSet("values", message, fib(parseInt(message)));
  });
}

async function getRedisClient() {
  const redisClient = redis.createClient({
    socket: {
      host: keys.redisHost,
      port: keys.redisPort,
      reconnectStrategy: () => 1000,
    },
  });

  await redisClient.connect();
  console.log("redis client connect");

  return redisClient;
}

function fib(index) {
  if (index < 2) {
    return 1;
  }
  return fib(index - 1) + fib(index - 2);
}
