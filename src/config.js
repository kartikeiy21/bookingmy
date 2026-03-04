require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3000),
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  totalSeats: Number(process.env.TOTAL_SEATS || 100),
  lockTtlSeconds: Number(process.env.LOCK_TTL_SECONDS || 30)
};

module.exports = { config };
