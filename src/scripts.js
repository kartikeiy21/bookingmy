const LOCK_SCRIPT = `
local eventKey = KEYS[1]
local lockPrefix = KEYS[2]
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

for i = 3, #ARGV do
  local seatId = ARGV[i]
  local seatState = redis.call('HGET', eventKey, seatId)
  if seatState == 'booked' then
    return {0, 'SEAT_ALREADY_BOOKED:' .. seatId}
  end

  local lockKey = lockPrefix .. seatId
  local lockOwner = redis.call('GET', lockKey)
  if lockOwner and lockOwner ~= userId then
    return {0, 'SEAT_ALREADY_LOCKED:' .. seatId}
  end
end

for i = 3, #ARGV do
  local seatId = ARGV[i]
  local lockKey = lockPrefix .. seatId
  redis.call('SET', lockKey, userId, 'EX', ttl)
end

return {1, 'LOCKED'}
`;

const CONFIRM_SCRIPT = `
local eventKey = KEYS[1]
local lockPrefix = KEYS[2]
local userId = ARGV[1]

for i = 2, #ARGV do
  local seatId = ARGV[i]
  local seatState = redis.call('HGET', eventKey, seatId)
  if seatState == 'booked' then
    return {0, 'SEAT_ALREADY_BOOKED:' .. seatId}
  end

  local lockKey = lockPrefix .. seatId
  local lockOwner = redis.call('GET', lockKey)
  if lockOwner ~= userId then
    return {0, 'LOCK_NOT_OWNED:' .. seatId}
  end
end

for i = 2, #ARGV do
  local seatId = ARGV[i]
  redis.call('HSET', eventKey, seatId, 'booked')
  local lockKey = lockPrefix .. seatId
  redis.call('DEL', lockKey)
end

return {1, 'BOOKED'}
`;

const RELEASE_SCRIPT = `
local lockPrefix = KEYS[1]
local userId = ARGV[1]

for i = 2, #ARGV do
  local seatId = ARGV[i]
  local lockKey = lockPrefix .. seatId
  local lockOwner = redis.call('GET', lockKey)
  if lockOwner == userId then
    redis.call('DEL', lockKey)
  end
end

return {1, 'RELEASED'}
`;

module.exports = {
  LOCK_SCRIPT,
  CONFIRM_SCRIPT,
  RELEASE_SCRIPT
};
