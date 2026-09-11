# CowCare — Cattle Health & Veterinary Care Platform

Full-stack app connecting Farmers, Veterinarians, and Admins around a permanent
digital identity for every cow. See `/docs` conceptually in the original spec
for full product context — this README covers running the code.

## Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (access token + httpOnly refresh cookie)
- **File uploads:** Multer
- **Real-time:** Socket.IO

## Project Structure

```
cowcare/
├── backend/          Express API, MongoDB models, Socket.IO
└── frontend/         React + Vite + Tailwind SPA
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGO_URI to your MongoDB Atlas connection string,
# and set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to long random strings.
npm run dev
```

The API runs on `http://localhost:5000` by default. Health check:
`GET http://localhost:5000/api/health`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`. In development, Vite proxies
`/api`, `/uploads`, and `/socket.io` to `http://localhost:5000` (see
`vite.config.js`) — so both servers need to be running together.

## First-time use

1. Register a Farmer account (captures a default farm location via
   geolocation — allow the browser permission prompt, or set it later from
   Profile Settings).
2. Register a Veterinarian account in a separate browser/incognito session.
3. As the farmer: add a cow (generates a permanent `CW-IND-XX-000001`-style
   ID and QR code), then book a veterinary visit.
4. As the vet: accept the request, progress it through
   On the way → Arrived → Start Examination, then complete the visit with a
   clinical assessment and treatment — this is saved permanently to the
   cow's health timeline.
5. An Admin account isn't self-registrable by design (per the spec). Create
   one with the seed script:
   ```bash
   cd backend
   npm run seed
   # Optional: override defaults via env vars first
   # SEED_ADMIN_PHONE=9999999999 SEED_ADMIN_PASSWORD=YourPassword npm run seed
   ```
   Then log in with that phone/password and change the password from
   Profile Settings. Safe to re-run — does nothing if that admin already exists.

## Running Tests

```bash
cd backend
npm test
```

Covers the request status state machine (every valid/invalid transition and
role gate), QR generation, vet on-duty computation (schedule + manual
override combined), and the full input-validation layer (auth, cattle,
booking, rating, and transfer validators) — 39 tests total, using Node's
built-in test runner, no extra dependencies. These run without a database connection since they
target pure logic and validation chains directly. Full end-to-end
integration tests against a real MongoDB instance are a reasonable next
step but weren't possible in the sandboxed environment this was built in
(no network access to MongoDB's binary distribution for an in-memory test
DB).

## New Features (beyond the original spec)

Five features were added after the initial build, each end-to-end (backend +
frontend + tests where the sandbox allowed it):

- **Voice messages to the vet** — farmers can record up to a 60-second voice
  note during booking instead of (or alongside) typing, using the browser's
  MediaRecorder API. Vets get a clear "🎙️ Voice note attached" flag and an
  inline player.
- **Post-visit ratings** — farmers rate a completed visit 1–5 stars with an
  optional comment, exactly once. Aggregate ratings show on the vet's own
  profile (self-accountability) and to farmers once a vet is assigned.
- **Recurring vet availability schedules** — vets can set real weekly
  working hours (per day, working/off + start/end time) instead of only a
  manual on/off toggle. The toggle still works as a quick override on top
  of the schedule. Fully backward compatible — a vet who never configures
  a schedule behaves exactly as before.
- **Emergency escalation** — a background sweep (every minute, no extra
  infrastructure) re-broadcasts EMERGENCY requests that have sat unaccepted
  past a configurable threshold, including to off-duty vets who've opted
  into emergency alerts. The farmer is told honestly that the search has
  widened, and admin can see every escalated case still waiting.
- **Cattle ownership transfer** — a farmer can transfer a cow (and its full
  permanent health history) to another registered farmer by phone number.
  The recipient must explicitly accept before ownership changes — nothing
  transfers without two-party consent. An atomic conditional update guards
  against a double-transfer race, mirroring the same pattern used for
  request acceptance.

- **Preferred veterinarian requests** — farmers can browse active vets,
  filter by specialization or on-duty status, save favorites, and direct a
  booking to one vet. A direct request automatically becomes the normal
  on-duty broadcast after 15 minutes (configurable with
  `DIRECT_REQUEST_FALLBACK_MINUTES`) or immediately when that vet declines.

## Notes on production deployment

- `axiosClient.js` uses a relative `/api` base URL, assuming the frontend is
  served from the same origin as the API (or proxied there). If you deploy
  the frontend and backend on different domains, set an absolute API URL and
  update CORS (`CLIENT_URL`) and cookie `sameSite`/`secure` settings
  accordingly.
- Uploaded files are stored on local disk (`backend/uploads`). For a real
  deployment behind multiple instances, switch Multer's storage engine to a
  cloud bucket (S3-compatible) instead of disk storage.
- The server validates required environment variables (`MONGO_URI`,
  `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) at startup and fails fast with a
  clear message if any are missing, rather than failing later inside a
  request handler.
- Rate limiting is tiered: a generous global backstop on all `/api` routes,
  a strict limiter on `/api/auth/login` and `/api/auth/register`, and a
  moderate limiter on record-creating endpoints (cattle, requests, medical
  events) to prevent spam.
- List endpoints that could otherwise grow unbounded (`GET /api/requests`,
  `GET /api/admin/users`) now support `page`/`limit` query params (default
  50, capped at 100) and return a `pagination` object. The frontend
  currently requests the max page size (100) rather than building full
  pagination UI — fine at demo/early scale, worth revisiting with real
  pagination controls if either list regularly exceeds that.
- Accepting a veterinary request uses an atomic conditional update
  (`findOneAndUpdate` with the expected current status as part of the
  query), not a read-then-save. This closes a real race condition: without
  it, two veterinarians tapping "Accept" on the same request within
  milliseconds of each other could both succeed, silently double-assigning
  the case. Now only one write can match; the other gets a 409 and the UI
  refreshes to show the real state.
- **Emergency escalation**: a background sweep (runs every minute, no extra
  infrastructure needed) checks for EMERGENCY requests that have sat
  unaccepted past `EMERGENCY_ESCALATION_MINUTES` (default 10). When one is
  found, it re-notifies every currently on-duty vet with elevated urgency,
  also notifies off-duty vets who've opted into emergency override (a
  toggle in their Profile Settings), tells the farmer honestly that the
  search has widened, and flags it on the admin dashboard. Each request is
  only escalated once (`escalatedAt` prevents repeat escalation on every
  sweep).
- Input validation (via `express-validator`) runs on all write endpoints —
  auth, cattle, requests, and medical records — before controllers touch the
  data.
- The server handles `SIGTERM`/`SIGINT` gracefully, closing the HTTP server
  and MongoDB connection cleanly instead of dropping in-flight requests.
- The frontend uses route-based code splitting (`React.lazy` + `Suspense`),
  so the initial JS payload only includes what's needed for the screen
  being visited — the QR-scanner library, for instance, loads only when a
  vet opens the scan page.

## Status

**Functional core** — auth, cattle registry + QR, veterinary booking state
machine, clinical workflow, real-time notifications, reminders, and admin
dashboard — is complete and verified via clean builds and manual code
review (live database testing isn't possible in the environment this was
built in, since it has no network access to MongoDB's binary distribution).

**Design pass** — a full custom visual identity (biologically/agriculturally
grounded palette, Fraunces + IBM Plex typography, the cattle profile
redesigned as a literal "health passport," chemistry-motif styling on
treatment/medicine sections, color-coded clinical record sections) has been
applied across auth screens, dashboards, the booking flow, cattle profile,
vet workflow, and admin pages.

**Responsive layout** — mobile bottom nav + desktop sidebar, mobile-first
booking flow, and a dead hamburger-menu button found and removed during
review — is in place, though it hasn't been tested on real physical
devices (only via responsive breakpoints in a build/browser environment).

**Non-functional hardening** — real input validation on all write
endpoints, tiered rate limiting, startup env validation, graceful shutdown,
route-based code splitting (cut the initial JS bundle from ~790KB to
~340KB), and an automated test suite (24 tests covering the state machine,
QR generation, and validation layer) are done. Full integration tests
against a live database are the one remaining gap — not possible in this
sandboxed build environment, but straightforward to add once you have a
real MongoDB connection (e.g. with `mongodb-memory-server` or a test Atlas
cluster).
