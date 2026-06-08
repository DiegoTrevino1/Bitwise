# Bitwise

An interactive web app for learning cache memory mapping — built for CWU's Computer Architecture course. Students work through a structured learning path: take a pre-assessment, play three progressively harder cache-mapping games, then retake the quiz to measure what they learned.

---

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB Atlas connection string (or local MongoDB instance)

### 1 — Backend setup

1. Navigate to the `backend/` folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `backend/.env` with the following values:

```env
PORT=4000
JWT_SECRET=replace-me-with-a-long-random-string
MONGODB_URI=your-mongodb-connection-string
CORS_ORIGIN=http://localhost:5173
```

- `JWT_SECRET` must be a long, random string — keep it secret.
- `MONGODB_URI` is your MongoDB Atlas connection string (or a local `mongodb://` URI).
- `CORS_ORIGIN` must match the frontend dev server URL.

4. Start the backend in development mode:

```bash
npm run dev
```

The backend starts on `http://localhost:4000` by default.

5. Confirm it is running:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{ "ok": true }
```

### 2 — Frontend setup

1. Open a second terminal and navigate to `frontend/`:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

The frontend starts on `http://localhost:5173`.

### 3 — Open the app

```
http://localhost:5173
```

The frontend calls the backend at `http://localhost:4000/api`. Make sure both servers are running.

### 4 — Common issues

- **CORS errors** — verify `CORS_ORIGIN` in `backend/.env` exactly matches the frontend URL (including port).
- **Backend won't start** — confirm `JWT_SECRET` and `MONGODB_URI` are set in `backend/.env` and that `npm install` completed without errors.
- **Frontend can't reach the API** — check the browser console for network errors and confirm the backend is running on port 4000.
- **Wrong Node version** — run `node -v` and confirm it is 18 or newer.

---

## Features

- **Three game modes** — Fully Associative, Direct Mapping, and Set-Associative, each with Easy / Medium / Hard difficulties
- **Progressive unlocking** — score 80%+ on a difficulty to unlock the next; score 80%+ on Hard to advance to the next mode
- **Pre/post assessments** — quiz before and after gameplay to measure learning improvement
- **XP & leaderboard** — score-based XP system with a live class leaderboard and activity feed
- **User accounts** — register/login with JWT auth; all progress is saved per user in MongoDB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Atlas) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Styling | Plain CSS with a `bw-*` design system (Outfit + JetBrains Mono) |

---

## Project Structure

```
Bitwise/
├── frontend/                    # Vite + React app
│   └── src/
│       ├── main.jsx             # React entry point
│       ├── App.jsx              # Root component — routing, unlock logic, progress state
│       ├── App.css              # Global design system (all bw-* classes)
│       ├── LoginPage.jsx        # Login / Register form
│       ├── LibraryCacheGame.jsx # Core cache-mapping game (all three modes + difficulties)
│       ├── PreAssessment.jsx    # Pre and post assessment quiz
│       ├── GameConfigs.js       # Mode and difficulty configuration
│       └── api.js               # fetch wrapper + token management (calls :4000/api)
│
└── backend/                     # Express REST API
    ├── server.js                # HTTP server entry point
    ├── .env                     # Local env vars (not committed)
    └── src/
        ├── app.js               # Express app setup + route mounting
        ├── config.js            # Env var validation (PORT, JWT_SECRET, MONGODB_URI, CORS_ORIGIN)
        ├── db.js                # MongoDB connection
        ├── controllers/
        │   ├── auth.controller.js         # register / login / me
        │   ├── progress.controller.js     # save sessions, summary, recent activity
        │   ├── assessment.controller.js   # pre/post assessment submission and results
        │   ├── leaderboard.controller.js  # ranked XP totals
        │   └── stats.controller.js        # aggregate plays / XP / accuracy
        ├── routes/              # One router file per resource (mirrors controllers/)
        ├── middleware/
        │   ├── auth.js          # JWT bearer-token verification
        │   └── errors.js        # 404 + global error handler
        └── utils/
            └── jwt.js           # sign / verify helpers
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/register` | — | Create account → returns JWT |
| POST | `/api/auth/login` | — | Login → returns JWT |
| GET | `/api/auth/me` | ✓ | Current user info |
| POST | `/api/progress` | ✓ | Save a play session |
| GET | `/api/progress/me` | ✓ | Current user's progress across all modes |
| GET | `/api/progress/recent?limit=N` | — | Recent activity feed |
| GET | `/api/leaderboard?limit=N` | — | Top students by XP |
| GET | `/api/stats/overview` | — | Aggregate plays / XP / accuracy |
| POST | `/api/assessment` | ✓ | Submit pre or post assessment score |
| GET | `/api/assessment/me` | ✓ | Current user's assessment results |

---

## Scripts

| Location | Command | Description |
|---|---|---|
| `backend/` | `npm run dev` | Start backend with hot-reload (nodemon) |
| `backend/` | `npm start` | Start backend (production) |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run build` | Production build → `frontend/dist/` |
| `frontend/` | `npm run preview` | Preview production build locally |
