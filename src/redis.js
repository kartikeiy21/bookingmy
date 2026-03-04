const Redis = require('ioredis');
const { config } = require('./config');

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  lazyConnect: true
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

let connected = false;
let connectPromise = null;

async function ensureRedisConnected() {
  if (connected) return;
  if (!connectPromise) {
    connectPromise = redis
      .connect()
      .then(() => {
        connected = true;
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  await connectPromise;
}

module.exports = { redis, ensureRedisConnected };
