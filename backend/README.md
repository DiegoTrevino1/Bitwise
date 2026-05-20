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

## Setup and run

1. Install dependencies:

```sh
npm install
```

2. Create a new `.env` file in the backend folder with these values:

```env
PORT=4000
JWT_SECRET=replace-me-with-a-long-random-string
DB_PATH=./data/app.db
CORS_ORIGIN=http://localhost:5173
```

3. Start the backend server in development mode:

```sh
npm run dev
```

4. Or start production-style with:

```sh
npm start
```

The server listens on `http://localhost:4000` by default. The SQLite database file (`./data/app.db`) and its directory are created automatically on first boot.

### Health check

```sh
curl http://localhost:4000/api/health
# { "ok": true }
```

## Configuration

Set these values in `backend/.env`:

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
