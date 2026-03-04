const app = require('./app');
const { config } = require('./config');
const { ensureSeatInventory } = require('./services/bookingService');

async function start() {
  await ensureSeatInventory();
  app.listen(config.port, () => {
    console.log(`Booking system running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
