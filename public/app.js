const state = {
  selected: new Set(),
  seats: [],
  userId: `user_${Math.floor(Math.random() * 900 + 100)}`
};

const userIdInput = document.getElementById('userId');
const seatGrid = document.getElementById('seatGrid');
const statsNode = document.getElementById('stats');
const messageNode = document.getElementById('message');

userIdInput.value = state.userId;

function setMessage(text, isError = false) {
  messageNode.textContent = text;
  messageNode.style.color = isError ? '#fca5a5' : '#bef264';
}

function selectedSeatIds() {
  return Array.from(state.selected).sort();
}

function drawStats(summary) {
  statsNode.innerHTML = `
    <div class="stat-card"><span>Total Seats</span><strong>${summary.total}</strong></div>
    <div class="stat-card"><span>Available</span><strong>${summary.available}</strong></div>
    <div class="stat-card"><span>Locked</span><strong>${summary.locked}</strong></div>
    <div class="stat-card"><span>Booked</span><strong>${summary.booked}</strong></div>
  `;
}

function seatClass(seat) {
  if (seat.offline) return 'offline';
  if (seat.state === 'booked') return 'booked';
  if (seat.lock?.lockedBy === userIdInput.value.trim()) return 'mine';
  if (seat.lock) return 'locked';
  return 'available';
}

function drawSeats() {
  seatGrid.innerHTML = '';

  for (const seat of state.seats) {
    const className = seatClass(seat);
    const button = document.createElement('button');
    button.className = `seat ${className}`;
    button.type = 'button';

    const isSelected = state.selected.has(seat.seatId);
    if (isSelected) button.classList.add('selected');

    const ttlText = seat.lock?.ttlSeconds > 0 ? ` (${seat.lock.ttlSeconds}s)` : '';
    button.textContent = `${seat.seatId}${ttlText}`;

    const isUnavailable =
      className === 'booked' || className === 'locked' || className === 'mine' || className === 'offline';
    if (!isUnavailable || isSelected) {
      button.addEventListener('click', () => {
        if (state.selected.has(seat.seatId)) {
          state.selected.delete(seat.seatId);
        } else {
          state.selected.add(seat.seatId);
        }
        drawSeats();
      });
    } else {
      button.disabled = true;
    }

    seatGrid.appendChild(button);
  }
}

async function callApi(path, method, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(path, options);
  const text = await res.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_err) {
      data = null;
    }
  }

  if (!res.ok) {
    const cleaned = text ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) : '';
    throw new Error((data && data.error) || cleaned || `Request failed with status ${res.status}`);
  }

  if (!data) {
    throw new Error('Server returned a non-JSON response.');
  }

  if (data.success === false) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function renderOfflineSeatMap(total = 60) {
  state.seats = Array.from({ length: total }, (_, idx) => ({
    seatId: `S${String(idx + 1).padStart(3, '0')}`,
    state: 'available',
    lock: null,
    offline: true
  }));

  drawStats({ total, available: 0, locked: 0, booked: 0 });
  drawSeats();
}

async function refreshSeats() {
  try {
    const data = await callApi('/api/seats', 'GET');
    state.seats = data.seats;

    const available = new Set(
      state.seats.filter((s) => !s.lock && s.state === 'available').map((s) => s.seatId)
    );

    for (const seatId of selectedSeatIds()) {
      if (!available.has(seatId)) {
        state.selected.delete(seatId);
      }
    }

    drawStats(data.summary);
    drawSeats();
  } catch (err) {
    setMessage(`Backend error: ${err.message}`, true);
    renderOfflineSeatMap();
  }
}

async function lockSelected() {
  const seatIds = selectedSeatIds();
  if (!seatIds.length) {
    setMessage('Select at least one available seat.', true);
    return;
  }

  try {
    const data = await callApi('/api/lock', 'POST', {
      userId: userIdInput.value.trim(),
      seatIds
    });
    setMessage(`Seats locked for ${data.expiresInSeconds}s: ${data.lockedSeats.join(', ')}`);
    state.selected.clear();
    await refreshSeats();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function confirmSelectedMine() {
  const mine = state.seats
    .filter((s) => s.lock?.lockedBy === userIdInput.value.trim())
    .map((s) => s.seatId);

  if (!mine.length) {
    setMessage('No seats are currently locked by this user.', true);
    return;
  }

  try {
    const data = await callApi('/api/confirm', 'POST', {
      userId: userIdInput.value.trim(),
      seatIds: mine
    });
    setMessage(`Booking confirmed (${data.bookingId}). Remaining: ${data.remainingAvailable}`);
    await refreshSeats();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function releaseMine() {
  const mine = state.seats
    .filter((s) => s.lock?.lockedBy === userIdInput.value.trim())
    .map((s) => s.seatId);

  if (!mine.length) {
    setMessage('No locks to release for this user.', true);
    return;
  }

  try {
    await callApi('/api/release', 'POST', {
      userId: userIdInput.value.trim(),
      seatIds: mine
    });
    setMessage(`Released seats: ${mine.join(', ')}`);
    await refreshSeats();
  } catch (err) {
    setMessage(err.message, true);
  }
}

document.getElementById('lockBtn').addEventListener('click', lockSelected);
document.getElementById('confirmBtn').addEventListener('click', confirmSelectedMine);
document.getElementById('releaseBtn').addEventListener('click', releaseMine);

refreshSeats();
setInterval(refreshSeats, 2500);
