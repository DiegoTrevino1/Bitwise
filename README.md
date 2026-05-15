# Architects of Logic — Backend

Express + SQLite API for **Architects of Logic**. Handles user accounts,
records gameplay sessions for the `cache` and `spell` games, and serves
an XP leaderboard.

For a deeper tour of the codebase (directory layout, request lifecycle,
data model, conventions), see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Stack

- Node.js (CommonJS), Express 4
- SQLite via `better-sqlite3` (WAL mode)
- bcrypt + JWT (`jsonwebtoken`) for auth
- `dotenv` for configuration, `nodemon` for dev

## Quick start

```sh
cp .env.example .env        # then set JWT_SECRET to a long random string
npm install
npm run dev                 # nodemon — restarts on changes
# or
npm start                   # plain node server.js
```

The server listens on `http://localhost:4000` by default. The SQLite
database file (`./data/app.db`) and its directory are created on first
boot.

### Health check

```sh
curl http://localhost:4000/api/health
# { "ok": true }
```

## Configuration

Set in `.env` (see `.env.example`):

| Var           | Default                  | Notes                                |
| ------------- | ------------------------ | ------------------------------------ |
| `PORT`        | `4000`                   | HTTP port                            |
| `JWT_SECRET`  | — (required)             | HS256 signing key — server fails to boot without it |
| `DB_PATH`     | `./data/app.db`          | SQLite file path                     |
| `CORS_ORIGIN` | `http://localhost:5173`  | Allowed origin (frontend dev server) |

## API

Base prefix: `/api`. Protected routes require
`Authorization: Bearer <token>`.

| Method | Path                  | Auth | Purpose                              |
| ------ | --------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`         | —    | Liveness probe                       |
| POST   | `/api/auth/register`  | —    | Create user, return JWT              |
| POST   | `/api/auth/login`     | —    | Verify credentials, return JWT       |
| GET    | `/api/auth/me`        | JWT  | Current user (`id`, `username`)      |
| POST   | `/api/progress`       | JWT  | Record a play session                |
| GET    | `/api/progress/me`    | JWT  | Total XP + per-game stats            |
| GET    | `/api/leaderboard`    | —    | Top-N users by total XP (`?limit=`)  |

### Examples

Register and capture the token:

```sh
curl -s -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ada","password":"hunter22"}'
# { "token": "<jwt>", "user": { "id": 1, "username": "ada" } }
```

Record a play session:

```sh
curl -s -X POST http://localhost:4000/api/progress \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"gameId":"cache","score":420,"accuracy":0.87,"xpEarned":120}'
```

Fetch the leaderboard:

```sh
curl -s 'http://localhost:4000/api/leaderboard?limit=10'
```

### Validation rules

- **Username:** 3–32 chars, `[A-Za-z0-9_.-]` only, case-insensitive unique.
- **Password:** 6–200 chars (bcrypt-hashed at cost 10).
- **gameId:** `cache` or `spell`.
- **score / xpEarned:** integer in `[0, 100000]`.
- **accuracy:** float in `[0, 1]`.
- **leaderboard `limit`:** clamped to `[1, 100]`, default `10`.

JWTs are HS256, payload `{ uid }`, 7-day expiry.

## Project layout

```
server.js          Process entrypoint
src/
  app.js           Express wiring (middleware, routes, error handlers)
  config.js        Env loading + validation
  db.js            SQLite open + schema bootstrap
  routes/          HTTP routers (auth, progress, leaderboard)
  controllers/     Validation + SQL per endpoint
  middleware/      requireAuth, notFound, errorHandler
  utils/jwt.js     sign / verify helpers
data/app.db        SQLite database (gitignored, created on boot)
```

## Scripts

- `npm run dev` — start with `nodemon` (auto-restart on file changes)
- `npm start` — start with plain `node`
