# Bitwise

An interactive web app for learning cache memory mapping — built for CWU's Computer Architecture course. Students work through a structured learning path: take a pre-assessment, play three progressively harder cache-mapping games, then retake the quiz to measure what they learned.

---

## Features

- **Three game modes** — Direct Mapping, Set-Associative, and Fully Associative, unlocked in sequence
- **Pre/post assessments** — quiz before and after gameplay to track learning improvement
- **XP & leaderboard** — score-based XP system with a live class leaderboard and activity feed
- **User accounts** — register/login with JWT auth; progress is saved per user
- **Graceful offline mode** — the UI works with dummy data when the backend isn't running

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Node.js, Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Styling | Plain CSS with a `bw-*` design system (Outfit + JetBrains Mono) |

---

## Project Structure

```
Bitwise/
├── frontend/                    # Vite + React app
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Root component — routing between home/auth/game views
│       ├── App.css              # Global design system (all bw-* classes)
│       ├── LoginPage.jsx        # Login / Register form
│       ├── LibraryCacheGame.jsx # Core cache-mapping game (all three modes)
│       ├── NumberBaseDrill.jsx  # Number base conversion mini-game
│       ├── SpellCounter.jsx     # Bit-counting mini-game
│       └── api.js               # fetch wrapper + token management (calls :4000/api)
│
└── backend/                     # Express REST API
    ├── server.js                # HTTP server entry point
    ├── .env                     # Local env vars (not committed)
    ├── data/
    │   ├── app.db               # SQLite database (auto-created on first run)
    │   ├── questions.seed.json  # Question bank loaded into DB on startup
    │   └── games.seed.json      # Game metadata seed
    └── src/
        ├── app.js               # Express app setup + route mounting
        ├── config.js            # Env var validation (PORT, JWT_SECRET, DB_PATH, CORS_ORIGIN)
        ├── db.js                # DB init, schema creation, auto-seeding, migrations
        ├── controllers/
        │   ├── auth.controller.js         # register / login / /me
        │   ├── progress.controller.js     # save play sessions, recent activity feed
        │   ├── leaderboard.controller.js  # ranked XP totals
        │   ├── stats.controller.js        # aggregate plays / XP / accuracy
        │   ├── questions.controller.js    # fetch questions by game + type
        │   └── games.controller.js        # game catalog
        ├── routes/              # One router file per resource (mirrors controllers/)
        ├── middleware/
        │   ├── auth.js          # JWT bearer-token verification
        │   └── errors.js        # 404 + global error handler
        └── utils/
            └── jwt.js           # sign / verify helpers
```

---

## Database Schema

```
users          id, username (unique), password_hash, created_at
play_sessions  id, user_id → users, game_id, score, accuracy, xp_earned, created_at
questions      id, game_id, type, payload (JSON), sort_order, created_at
games          id, title, tag, icon, color, description, badges, status, sort_order
```

The database is created automatically at `backend/data/app.db` on first run. Questions and game metadata are seeded from the JSON files in `backend/data/` if the tables are empty.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/register` | — | Create account → returns JWT |
| POST | `/api/auth/login` | — | Login → returns JWT |
| GET | `/api/auth/me` | ✓ | Current user info |
| GET | `/api/games` | — | Game catalog |
| GET | `/api/questions/:gameId/:type` | — | Questions for a game mode |
| POST | `/api/progress` | ✓ | Save a play session |
| GET | `/api/progress/recent?limit=N` | — | Recent activity feed |
| GET | `/api/leaderboard?limit=N` | — | Top students by XP |
| GET | `/api/stats/overview` | — | Aggregate plays / XP / accuracy |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1 — Backend

```bash
cd backend
npm install
```

Create `backend/.env` with the following values:

```
PORT=4000
JWT_SECRET=replace-me-with-a-long-random-string
DB_PATH=./data/app.db
CORS_ORIGIN=http://localhost:5173
```

```bash
npm run dev        # starts on http://localhost:4000
```

The database and seed data are created automatically on first start.

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173). The frontend talks to the backend at `http://localhost:4000/api`. If the backend isn't running, the home page still renders with placeholder leaderboard and activity data.

---

## Scripts

| Location | Command | Description |
|---|---|---|
| `backend/` | `npm run dev` | Start backend with hot-reload (nodemon) |
| `backend/` | `npm start` | Start backend (production) |
| `backend/` | `npm run seed` | Re-seed questions and games from JSON files |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run build` | Production build → `frontend/dist/` |
| `frontend/` | `npm run preview` | Preview production build locally |
