# Bitwise — Backend

Express + MongoDB API for **Bitwise**. Handles user accounts, gameplay
sessions, assessments, XP tracking, and a class leaderboard.

## Stack

- Node.js (CommonJS), Express 4
- MongoDB Atlas via the official `mongodb` driver
- bcrypt + JWT (`jsonwebtoken`) for auth
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
   npm start        # production
   # or
   npm run dev      # nodemon — restarts on file changes
   ```

The server connects to MongoDB first, then listens on `http://localhost:4000`.
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

All variables go in `backend/.env`:

| Variable       | Required | Default                 | Notes                              |
| -------------- | -------- | ----------------------- | ---------------------------------- |
| `PORT`         | No       | `4000`                  | HTTP port                          |
| `JWT_SECRET`   | Yes      | —                       | Server won't boot without this     |
| `MONGODB_URI`  | Yes      | —                       | MongoDB Atlas connection string    |
| `CORS_ORIGIN`  | No       | `http://localhost:5173` | Frontend dev server origin         |

## API

Base prefix: `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path                   | Auth | Purpose                              |
| ------ | ---------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`          | —    | Liveness probe                       |
| POST   | `/api/auth/register`   | —    | Create user, return JWT              |
| POST   | `/api/auth/login`      | —    | Verify credentials, return JWT       |
| GET    | `/api/auth/me`         | JWT  | Current user (`id`, `username`)      |
| POST   | `/api/progress`        | JWT  | Record a game session                |
| GET    | `/api/progress/me`     | JWT  | Total XP + per-mode stats + rank     |
| GET    | `/api/progress/recent` | —    | Recent activity feed                 |
| GET    | `/api/leaderboard`     | —    | Top-N users by XP (`?limit=`)        |
| GET    | `/api/stats/overview`  | —    | Global play count, XP, avg accuracy  |
| POST   | `/api/assessment`      | JWT  | Submit pre or post assessment score  |
| GET    | `/api/assessment/me`   | JWT  | User's assessment results            |

## Project layout

```
server.js               Process entrypoint — connects MongoDB then starts Express
src/
  app.js                Express wiring (middleware, routes, error handlers)
  config.js             Env loading + validation
  db.js                 MongoDB connection, index setup, collections() helper
  routes/               One router file per feature
  controllers/          Request validation + database logic per endpoint
  middleware/           requireAuth, notFound, errorHandler
  utils/jwt.js          sign / verify helpers
```

## Scripts

| Command       | What it does                              |
| ------------- | ----------------------------------------- |
| `npm start`   | Start with plain `node`                   |
| `npm run dev` | Start with `nodemon` (auto-restart)       |
