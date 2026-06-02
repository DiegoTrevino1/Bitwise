# Bitwise — Backend

Express + MongoDB API for **Bitwise**, a cache mapping learning app built for CWU Computer Architecture. Handles user accounts, gameplay sessions, assessments, XP tracking, and a class leaderboard.

## Stack

- Node.js (CommonJS), Express 4
- MongoDB Atlas via the official `mongodb` driver
- `bcryptjs` + JWT (`jsonwebtoken`) for auth
- `dotenv` for configuration, `nodemon` for dev

## Quick start

1. **Create your `.env` file** in this folder:

   ```
   PORT=4000
   JWT_SECRET=<long random string>
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bitwise?appName=Bitwise
   CORS_ORIGIN=http://localhost:5173
   ```

2. **Install dependencies and start:**

   ```sh
   npm install
   npm start        # plain node
   # or
   npm run dev      # nodemon — restarts on file changes
   ```

You should see:

```
✅ MongoDB connected: bitwise
🚀 Bitwise backend running on http://localhost:4000
```

### Health check

```sh
curl http://localhost:4000/api/health
# { "ok": true }
```

## Configuration

| Variable       | Required | Default                 | Notes                           |
| -------------- | -------- | ----------------------- | ------------------------------- |
| `PORT`         | No       | `4000`                  | HTTP port                       |
| `JWT_SECRET`   | Yes      | —                       | Server won't boot without this  |
| `MONGODB_URI`  | Yes      | —                       | MongoDB Atlas connection string |
| `CORS_ORIGIN`  | No       | `http://localhost:5173` | Allowed frontend origin         |

## API

Base prefix: `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path                   | Auth | Purpose                             |
| ------ | ---------------------- | ---- | ----------------------------------- |
| GET    | `/api/health`          | —    | Liveness probe                      |
| POST   | `/api/auth/register`   | —    | Create user, return JWT             |
| POST   | `/api/auth/login`      | —    | Verify credentials, return JWT      |
| GET    | `/api/auth/me`         | JWT  | Current user (`id`, `username`)     |
| POST   | `/api/progress`        | JWT  | Record a game session               |
| GET    | `/api/progress/me`     | JWT  | Total XP + per-mode stats + rank    |
| GET    | `/api/progress/recent` | —    | Recent activity feed                |
| GET    | `/api/leaderboard`     | —    | Top-N users by XP (`?limit=`)       |
| GET    | `/api/stats/overview`  | —    | Global play count, XP, avg accuracy |
| POST   | `/api/assessment`      | JWT  | Submit pre or post assessment score |
| GET    | `/api/assessment/me`   | JWT  | User's assessment results           |

## Game modes & unlock rules

The three cache mapping modes must be completed in order. Each mode unlocks only when the previous mode's best accuracy is **80% or above**:

| Mode | ID            | Unlocks when                              |
| ---- | ------------- | ----------------------------------------- |
| 1    | `associative` | Pre-assessment complete                   |
| 2    | `direct`      | Fully Associative best accuracy ≥ 80%     |
| 3    | `set`         | Direct Mapping best accuracy ≥ 80%        |

The `accuracy` field on `/api/progress/me` stores the **best accuracy ever achieved** per mode (`$max`), so unlocks are permanent once earned.

## MongoDB collections

| Collection    | Key fields                                                        |
| ------------- | ----------------------------------------------------------------- |
| `users`       | `username`, `passwordHash`, `totalXp`, `createdAt`               |
| `sessions`    | `userId`, `gameId`, `modeId`, `score`, `accuracy`, `xpEarned`, `createdAt` |
| `assessments` | `userId`, `type` (pre\|post), `score`, `totalQuestions`, `xpEarned`, `createdAt` |

## Project layout

```
server.js          Entrypoint — connects MongoDB, starts Express (local only)
src/
  app.js           Express setup, middleware, routes
  config.js        Env loading + validation
  db.js            MongoDB connection, indexes, collections() helper
  routes/          One router per feature
  controllers/     Request validation + database logic
  middleware/      requireAuth, notFound, errorHandler
  utils/jwt.js     sign / verify helpers
```

## Deployment (Vercel)

The backend is deployed as a Vercel serverless function. `server.js` exports the Express app for Vercel and only calls `app.listen()` when running locally. A connection middleware in `app.js` ensures MongoDB connects before each request.

Set these environment variables in the Vercel dashboard:

- `JWT_SECRET`
- `MONGODB_URI`
- `CORS_ORIGIN` → your frontend Vercel URL

## Scripts

| Command       | What it does                        |
| ------------- | ----------------------------------- |
| `npm start`   | Start with plain `node`             |
| `npm run dev` | Start with `nodemon` (auto-restart) |
