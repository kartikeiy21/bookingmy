const path = require('path');
const express = require('express');
const cors = require('cors');
const {
  ensureSeatInventory,
  lockSeats,
  confirmSeats,
  releaseSeats,
  getSeatStatus
} = require('./services/bookingService');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', async (_req, res) => {
  await ensureSeatInventory();
  res.status(200).json({ ok: true });
});

app.get('/api/seats', async (_req, res) => {
  try {
    const result = await getSeatStatus();
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/lock', async (req, res) => {
  try {
    const { userId, seatIds } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required.' });
    }

    const result = await lockSeats({ userId, seatIds });
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.message });
    }

    return res.status(200).json({ success: true, ...result.data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/confirm', async (req, res) => {
  try {
    const { userId, seatIds } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required.' });
    }

    const result = await confirmSeats({ userId, seatIds });
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.message });
    }

    return res.status(200).json({ success: true, ...result.data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/release', async (req, res) => {
  try {
    const { userId, seatIds } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required.' });
    }

    const result = await releaseSeats({ userId, seatIds });
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.message });
    }

    return res.status(200).json({ success: true, ...result.data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
