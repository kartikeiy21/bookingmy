'use strict';

module.exports = {
  pickSeat,
  setUser
};

function pickSeat(context, events, done) {
  const seatNumber = Math.floor(Math.random() * 100) + 1;
  context.vars.seatId = `S${String(seatNumber).padStart(3, '0')}`;
  return done();
}

function setUser(context, events, done) {
  context.vars.userId = `vu_${context.vars.$uuid}`;
  return done();
}
