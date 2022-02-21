// db: only store index
// redis: store both index and value

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const keys = require("./keys");
const redis = require("redis");
const { json } = require("express");

apiServe();

async function apiServe() {
  // express setup
  const app = express();
  app.use(cors());
  app.use(json());

  const pgClient = getPGClient();

  const redisClient = await getRedisClient();
  const redisPublisher = redisClient.duplicate();
  await redisPublisher.connect();
  // Express route handlers
  app.get("/", (req, res) => {
    res.send("Hi");
  });

  app.get("/values/all", async (req, res) => {
    const values = await pgClient.query("SELECT * from values");

    res.send(values.rows);
  });

  // get current index, value
  app.get("/values/current", async (req, res) => {
    const values = await redisClient.hGetAll("values");

    res.send(values);
  });

  // index submit
  app.post("/values", (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
      return res.status(422).send("Index too high");
    }

    redisClient.hSet("values", index, "Nothing yet!");

    // trigger worker -> write value into redis
    redisPublisher.publish("insert", index);

    // write index into db
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({ working: true });
  });

  const port = 5000;
  app.listen(port, (err) => {
    console.log(`listening on: ${port}`);
  });
}

function getPGClient() {
  const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
  });

  // query -> create connection with pg
  pgClient.on("connect", async (client) => {
    // table name: values
    // column: number
    // type: INT
    await client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });

  return pgClient;
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
