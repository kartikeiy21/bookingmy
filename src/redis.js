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

async function ensureRedisConnected() {
  if (connected) return;
  await redis.connect();
  connected = true;
}

module.exports = { redis, ensureRedisConnected };
