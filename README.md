# Concurrent Ticket Booking System

Redis-backed concurrent ticket booking with seat locking and lock expiration.

## Features

- Atomic seat lock via Redis Lua script (`/api/lock`)
- Atomic booking confirmation (`/api/confirm`)
- Lock release endpoint (`/api/release`)
- Real-time seat map with lock timers (`/api/seats`)
- Frontend UI for selecting, locking, confirming seats
- Artillery load test config for concurrency simulation
- Vercel-ready deployment setup

## Tech Stack

- Node.js 18+
- Express.js
- Redis (`ioredis`)
- Vanilla frontend (HTML/CSS/JS)
- Artillery

## API Endpoints

- `GET /api/health`
- `GET /api/seats`
- `POST /api/lock`
  - body: `{ "userId": "user_1", "seatIds": ["S001", "S002"] }`
- `POST /api/confirm`
  - body: `{ "userId": "user_1", "seatIds": ["S001", "S002"] }`
- `POST /api/release`
  - body: `{ "userId": "user_1", "seatIds": ["S001", "S002"] }`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Start Redis locally (example with Docker):

```bash
docker run -p 6379:6379 redis:7
```

4. Start app:

```bash
npm run dev
```

App runs on `http://localhost:3000`.

## Load Test

Run while app is running:

```bash
npm run loadtest
```

You can tune `arrivalRate` and `duration` in [`loadtest/booking.yml`](/Users/eshaansharma/Downloads/OMIKA/loadtest/booking.yml).

## Deploy to Vercel

1. Push this code to your repo:

```bash
git init
git add .
git commit -m "Initial concurrent ticket booking system"
git branch -M main
git remote add origin https://github.com/omikak/booking-system.git
git push -u origin main
```

2. Import the GitHub repo in Vercel.

3. Add environment variables in Vercel project settings:
- `REDIS_URL`
- `TOTAL_SEATS` (optional, default `100`)
- `LOCK_TTL_SECONDS` (optional, default `30`)

4. Deploy.

## Is Upstash required?

No, Upstash is **not strictly required**.

You need **any Redis instance reachable from Vercel** over the network.

- Upstash is the easiest option for Vercel (managed, serverless-friendly, TLS, free tier).
- You can also use Redis Cloud, AWS ElastiCache (with proper network routing), Railway Redis, etc.

If you deploy on Vercel, using Upstash usually gives the smoothest setup.

## Project Structure

- [`src/app.js`](/Users/eshaansharma/Downloads/OMIKA/src/app.js): Express routes
- [`src/services/bookingService.js`](/Users/eshaansharma/Downloads/OMIKA/src/services/bookingService.js): Booking logic
- [`src/scripts.js`](/Users/eshaansharma/Downloads/OMIKA/src/scripts.js): Redis Lua scripts
- [`public/index.html`](/Users/eshaansharma/Downloads/OMIKA/public/index.html): Frontend UI
- [`loadtest/booking.yml`](/Users/eshaansharma/Downloads/OMIKA/loadtest/booking.yml): Artillery scenario
- [`vercel.json`](/Users/eshaansharma/Downloads/OMIKA/vercel.json): Vercel routing/build

