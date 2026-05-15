# Architecture

Backend for **Architects of Logic** — a small Express + SQLite API that
handles user accounts, records gameplay sessions, and exposes an XP
leaderboard.

## Stack

- **Runtime:** Node.js (CommonJS)
- **Web framework:** Express 4
- **Database:** SQLite via `better-sqlite3` (synchronous, WAL mode)
- **Auth:** bcrypt password hashing + JWT bearer tokens (`jsonwebtoken`)
- **Config:** `dotenv` (`.env`, see `.env.example`)
- **Dev:** `nodemon`

## Directory layout

```
server.js                  Process entrypoint — boots the Express app
src/
  app.js                   Express wiring: middleware, routes, error handlers
  config.js                Loads + validates environment variables
  db.js                    Opens SQLite, applies pragmas, creates schema
  routes/
    auth.routes.js         POST /register, POST /login, GET /me
    progress.routes.js     POST /, GET /me
    leaderboard.routes.js  GET /
  controllers/
    auth.controller.js     Register / login / current-user logic + validation
    progress.controller.js Record a play session, return per-user summary
    leaderboard.controller.js  Top-N users by total XP
  middleware/
    auth.js                requireAuth — verifies Bearer JWT, sets req.user
    errors.js              notFound + central errorHandler
  utils/
    jwt.js                 sign(userId) / verify(token) helpers
data/
  app.db                   SQLite file (gitignored, created on first boot)
```

## Request lifecycle

1. `server.js` loads `src/app.js`, which requires `src/config.js` (env
   validation) and `src/db.js` (opens SQLite + ensures schema).
2. Global middleware: `cors({ origin: CORS_ORIGIN })`, `express.json({ limit: '32kb' })`.
3. Routers are mounted under `/api/*`. Protected routes apply
   `requireAuth` before the controller.
4. Controllers validate input, run prepared SQL statements, and respond
   with JSON. Async controllers use `.catch(next)` so failures reach the
   error handler.
5. Unmatched paths hit `notFound` (404). Thrown errors hit
   `errorHandler`, which logs 5xx and returns a generic message unless
   `err.expose` is set.

## HTTP API

Base prefix: `/api`

| Method | Path                  | Auth | Purpose                              |
| ------ | --------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`         | —    | Liveness probe (`{ ok: true }`)      |
| POST   | `/api/auth/register`  | —    | Create user, return JWT              |
| POST   | `/api/auth/login`     | —    | Verify credentials, return JWT       |
| GET    | `/api/auth/me`        | JWT  | Current user (`id`, `username`)      |
| POST   | `/api/progress`       | JWT  | Record a play session                |
| GET    | `/api/progress/me`    | JWT  | Total XP + per-game stats            |
| GET    | `/api/leaderboard`    | —    | Top-N users by total XP (`?limit=`)  |

### Auth

- `Authorization: Bearer <token>` on protected routes.
- Tokens are HS256 JWTs signed with `JWT_SECRET`, payload `{ uid }`,
  7-day expiry.
- Passwords are bcrypt-hashed (cost 10) before storage.

### Validation

All input validation lives in the controllers — no schema library:

- `auth`: username 3–32 chars, charset `[A-Za-z0-9_.-]`; password 6–200 chars.
- `progress`: `gameId ∈ {cache, spell}`, `score ∈ [0, 100000]`,
  `accuracy ∈ [0, 1]`, `xpEarned ∈ [0, 100000]`.
- `leaderboard`: `limit` clamped to `[1, 100]`, default `10`.

## Data model

```sql
users (
  id            INTEGER PK,
  username      TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  created_at    INTEGER  -- unix seconds
)

play_sessions (
  id         INTEGER PK,
  user_id    INTEGER FK users(id) ON DELETE CASCADE,
  game_id    TEXT CHECK (game_id IN ('cache', 'spell')),
  score      INTEGER,
  accuracy   REAL,    -- 0..1
  xp_earned  INTEGER,
  created_at INTEGER  -- unix seconds
)

-- indexes
idx_sessions_user      (user_id)
idx_sessions_user_game (user_id, game_id)
```

Pragmas applied at boot: `journal_mode = WAL`, `foreign_keys = ON`.

Aggregations the API performs:

- **Total XP per user:** `SUM(xp_earned)` over `play_sessions`.
- **Per-game summary:** `MAX(score)`, `COUNT(*)`, `AVG(accuracy)` grouped by `game_id`.
- **Leaderboard:** `users LEFT JOIN play_sessions`, summed and ordered by
  `total_xp DESC, id ASC`.

## Configuration

Loaded once in `src/config.js` (throws if `JWT_SECRET` is missing):

| Var           | Default                  | Notes                                |
| ------------- | ------------------------ | ------------------------------------ |
| `PORT`        | `4000`                   | HTTP port                            |
| `JWT_SECRET`  | — (required)             | HS256 signing key                    |
| `DB_PATH`     | `./data/app.db`          | SQLite file path; dirs auto-created  |
| `CORS_ORIGIN` | `http://localhost:5173`  | Allowed origin (frontend dev server) |

## Conventions

- **CommonJS modules** (`require` / `module.exports`), matching `package.json`.
- **Prepared statements** are defined at module load and reused per request.
- **Controllers own validation and SQL**; routers only wire HTTP verbs to
  handlers and apply `requireAuth` where needed.
- **Errors** are surfaced through `next(err)`; the error handler decides
  what reaches the client.

## Run locally

```sh
cp .env.example .env        # set JWT_SECRET
npm install
npm run dev                 # nodemon server.js
```

The SQLite file and `data/` directory are created on first boot.
