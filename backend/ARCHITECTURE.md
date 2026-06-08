# Architecture

Backend for **Bitwise** — an Express + MongoDB API that handles user accounts, records gameplay sessions, tracks assessments, and exposes an XP leaderboard.

## Stack

- **Runtime:** Node.js (CommonJS)
- **Web framework:** Express 4
- **Database:** MongoDB Atlas via the official `mongodb` driver
- **Auth:** bcrypt password hashing + JWT bearer tokens (`jsonwebtoken`)
- **Config:** `dotenv` (`.env`)
- **Dev:** `nodemon`

## Directory layout

```
server.js                    Process entrypoint — connects MongoDB, starts Express (local only)
src/
  app.js                     Express wiring: middleware, routes, error handlers
  config.js                  Loads + validates environment variables
  db.js                      MongoDB connection + collections() helper
  routes/
    auth.routes.js            POST /register, POST /login, GET /me
    progress.routes.js        POST /, GET /me, GET /recent
    assessment.routes.js      POST /, GET /me
    leaderboard.routes.js     GET /
    stats.routes.js           GET /overview
  controllers/
    auth.controller.js        Register / login / current-user logic
    progress.controller.js    Record play sessions, per-user summary, recent activity
    assessment.controller.js  Submit and retrieve pre/post assessment scores
    leaderboard.controller.js Top-N users by total XP
    stats.controller.js       Aggregate plays / XP / accuracy across all users
  middleware/
    auth.js                   requireAuth — verifies Bearer JWT, sets req.user
    errors.js                 notFound + central errorHandler
  utils/
    jwt.js                    sign(userId) / verify(token) helpers
```

## Request lifecycle

1. `server.js` connects to MongoDB then starts Express (skipped on Vercel — serverless handler instead).
2. A per-request middleware in `app.js` calls `connect()` to ensure the MongoDB connection is live before any handler runs.
3. Global middleware: `cors({ origin: CORS_ORIGIN })`, `express.json({ limit: '32kb' })`.
4. Routers are mounted under `/api/*`. Protected routes apply `requireAuth` before the controller.
5. Controllers validate input, run MongoDB operations, and respond with JSON.
6. Unmatched paths hit `notFound` (404). Thrown errors hit `errorHandler`.

## HTTP API

Base prefix: `/api`

| Method | Path                    | Auth | Purpose                              |
| ------ | ----------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`           | —    | Liveness probe (`{ ok: true }`)      |
| POST   | `/api/auth/register`    | —    | Create user, return JWT              |
| POST   | `/api/auth/login`       | —    | Verify credentials, return JWT       |
| GET    | `/api/auth/me`          | JWT  | Current user (`id`, `username`)      |
| POST   | `/api/progress`         | JWT  | Record a play session                |
| GET    | `/api/progress/me`      | JWT  | Total XP + per-config-ID stats + rank |
| GET    | `/api/progress/recent`  | —    | Recent activity feed                 |
| GET    | `/api/leaderboard`      | —    | Top-N users by total XP (`?limit=`)  |
| GET    | `/api/stats/overview`   | —    | Global plays / XP / accuracy         |
| POST   | `/api/assessment`       | JWT  | Submit pre or post assessment score  |
| GET    | `/api/assessment/me`    | JWT  | User's pre and post assessment results |

### Auth

- `Authorization: Bearer <token>` on protected routes.
- Tokens are HS256 JWTs signed with `JWT_SECRET`, payload `{ uid }`, 7-day expiry.
- Passwords are bcrypt-hashed (cost 10) before storage.

### Validation

- `auth`: username 3–32 chars, charset `[A-Za-z0-9_.-]`; password 6–200 chars.
- `progress`: `modeId` must be one of the 9 valid config IDs; `score ∈ [0, ∞)`, `accuracy ∈ [0, 1]`, `xpEarned ∈ [0, ∞)`.
- `leaderboard`: `limit` clamped to `[1, 50]`, default `10`.

## Data model

### `users`
| Field          | Type     | Notes                        |
| -------------- | -------- | ---------------------------- |
| `_id`          | ObjectId |                              |
| `username`     | String   | Unique, case-sensitive        |
| `passwordHash` | String   | bcrypt hash                  |
| `totalXp`      | Number   | Incremented on XP improvement |
| `createdAt`    | Date     |                              |

### `sessions`
| Field       | Type     | Notes                              |
| ----------- | -------- | ---------------------------------- |
| `_id`       | ObjectId |                                    |
| `userId`    | ObjectId | Ref → `users`                      |
| `gameId`    | String   | e.g. `"cache"`                     |
| `modeId`    | String   | Config ID e.g. `"associativeHard"` |
| `score`     | Number   |                                    |
| `accuracy`  | Number   | 0–1                                |
| `xpEarned`  | Number   |                                    |
| `createdAt` | Date     |                                    |

### `assessments`
| Field            | Type     | Notes                  |
| ---------------- | -------- | ---------------------- |
| `_id`            | ObjectId |                        |
| `userId`         | ObjectId | Ref → `users`          |
| `type`           | String   | `"pre"` or `"post"`    |
| `score`          | Number   |                        |
| `totalQuestions` | Number   |                        |
| `xpEarned`       | Number   |                        |
| `createdAt`      | Date     |                        |

Key aggregation in `/api/progress/me`: groups `sessions` by `modeId`, returning `$max(accuracy)`, `$max(xpEarned)`, and `$sum(1)` (play count) for each of the 9 config IDs.

## Configuration

| Var            | Default                 | Notes                           |
| -------------- | ----------------------- | ------------------------------- |
| `PORT`         | `4000`                  | HTTP port                       |
| `JWT_SECRET`   | — (required)            | HS256 signing key               |
| `MONGODB_URI`  | — (required)            | MongoDB Atlas connection string |
| `CORS_ORIGIN`  | `http://localhost:5173` | Allowed origin (frontend)       |

## Conventions

- **CommonJS modules** (`require` / `module.exports`).
- **Controllers own validation and database logic**; routers only wire HTTP verbs to handlers.
- **Errors** are surfaced through `next(err)`; the error handler decides what reaches the client.
- **XP is additive only** — a session only increments `totalXp` if its `xpEarned` exceeds the user's previous best for that `modeId`.

## Deployment (Vercel)

`server.js` exports the Express app for Vercel and only calls `app.listen()` when `process.env.VERCEL` is not set. A connection middleware ensures MongoDB connects before each serverless invocation.

Required Vercel environment variables: `JWT_SECRET`, `MONGODB_URI`, `CORS_ORIGIN`.
