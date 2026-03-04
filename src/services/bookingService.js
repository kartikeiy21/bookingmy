const crypto = require('crypto');
const { config } = require('../config');
const { redis, ensureRedisConnected } = require('../redis');
const { LOCK_SCRIPT, CONFIRM_SCRIPT, RELEASE_SCRIPT } = require('../scripts');

const EVENT_KEY = 'event:seats';
const LOCK_PREFIX = 'event:lock:seat:';

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function buildSeatIds(totalSeats) {
  return Array.from({ length: totalSeats }, (_, i) => `S${String(i + 1).padStart(3, '0')}`);
}

async function ensureSeatInventory() {
  await ensureRedisConnected();
  const seatCount = await redis.hlen(EVENT_KEY);
  if (seatCount > 0) return;

  const seatIds = buildSeatIds(config.totalSeats);
  const seatMap = seatIds.reduce((acc, seatId) => {
    acc[seatId] = 'available';
    return acc;
  }, {});

  if (Object.keys(seatMap).length) {
    await redis.hset(EVENT_KEY, seatMap);
  }
}

function validateSeatSelection(seatIds) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return 'At least one seat is required.';
  }

  const uniqueCount = new Set(seatIds).size;
  if (uniqueCount !== seatIds.length) {
    return 'Seat list has duplicate entries.';
  }

  return null;
}

async function lockSeats({ userId, seatIds }) {
  await ensureSeatInventory();

  const validationError = validateSeatSelection(seatIds);
  if (validationError) {
    return { ok: false, status: 400, message: validationError };
  }

  const result = await redis.eval(
    LOCK_SCRIPT,
    2,
    EVENT_KEY,
    LOCK_PREFIX,
    userId,
    String(config.lockTtlSeconds),
    ...seatIds
  );

  if (Number(result[0]) !== 1) {
    return { ok: false, status: 409, message: result[1] };
  }

  return {
    ok: true,
    status: 200,
    data: {
      lockId: createId('lock'),
      lockedSeats: seatIds,
      expiresInSeconds: config.lockTtlSeconds
    }
  };
}

async function confirmSeats({ userId, seatIds }) {
  await ensureSeatInventory();

  const validationError = validateSeatSelection(seatIds);
  if (validationError) {
    return { ok: false, status: 400, message: validationError };
  }

  const result = await redis.eval(CONFIRM_SCRIPT, 2, EVENT_KEY, LOCK_PREFIX, userId, ...seatIds);

  if (Number(result[0]) !== 1) {
    return { ok: false, status: 409, message: result[1] };
  }

  const remaining = await redis.hvals(EVENT_KEY);
  const remainingAvailable = remaining.filter((status) => status === 'available').length;

  return {
    ok: true,
    status: 200,
    data: {
      bookingId: createId('bk'),
      bookedSeats: seatIds,
      remainingAvailable
    }
  };
}

async function releaseSeats({ userId, seatIds }) {
  await ensureSeatInventory();

  const validationError = validateSeatSelection(seatIds);
  if (validationError) {
    return { ok: false, status: 400, message: validationError };
  }

  await redis.eval(RELEASE_SCRIPT, 1, LOCK_PREFIX, userId, ...seatIds);

  return {
    ok: true,
    status: 200,
    data: {
      releasedSeats: seatIds
    }
  };
}

async function getSeatStatus() {
  await ensureSeatInventory();

  const seatMap = await redis.hgetall(EVENT_KEY);
  const seatIds = Object.keys(seatMap).sort();

  const locks = await Promise.all(
    seatIds.map(async (seatId) => {
      const key = `${LOCK_PREFIX}${seatId}`;
      const [lockedBy, ttlSeconds] = await Promise.all([redis.get(key), redis.ttl(key)]);
      return [seatId, lockedBy ? { lockedBy, ttlSeconds } : null];
    })
  );

  const lockMap = Object.fromEntries(locks);

  const summary = seatIds.reduce(
    (acc, seatId) => {
      if (seatMap[seatId] === 'booked') {
        acc.booked += 1;
      } else if (lockMap[seatId]) {
        acc.locked += 1;
      } else {
        acc.available += 1;
      }
      return acc;
    },
    { total: seatIds.length, available: 0, locked: 0, booked: 0 }
  );

  return {
    summary,
    seats: seatIds.map((seatId) => ({
      seatId,
      state: seatMap[seatId],
      lock: lockMap[seatId]
    }))
  };
}

module.exports = {
  ensureSeatInventory,
  lockSeats,
  confirmSeats,
  releaseSeats,
  getSeatStatus
};
