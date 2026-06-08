# Bitwise — Architecture Guide

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend](#2-frontend)
3. [Backend](#3-backend)
4. [Database](#4-database)
5. [Authentication](#5-authentication)
6. [Game Logic & Unlock System](#6-game-logic--unlock-system)
7. [Data Flow](#7-data-flow)
8. [Deployment](#8-deployment)
9. [Environment Variables](#9-environment-variables)

---

## 1. System Overview

Bitwise is a **client-server web application** with three layers:

```
┌─────────────────────────────────────┐
│         Browser (React SPA)         │
│   - Renders UI                      │
│   - Runs all game logic             │
│   - Manages unlock state            │
└──────────────┬──────────────────────┘
               │  REST API (JSON over HTTPS)
               ▼
┌─────────────────────────────────────┐
│     Backend (Express on Vercel)     │
│   - Auth (register / login / JWT)   │
│   - Save & retrieve progress        │
│   - Leaderboard & stats             │
└──────────────┬──────────────────────┘
               │  MongoDB driver
               ▼
┌─────────────────────────────────────┐
│         MongoDB Atlas               │
│   - users                           │
│   - sessions                        │
│   - assessments                     │
└─────────────────────────────────────┘
```

Both the frontend and backend are deployed on **Vercel**. The backend runs as a Vercel Serverless Function. The database is hosted on **MongoDB Atlas**.

---

## 2. Frontend

**Stack:** React 19, Vite 8, plain CSS

### Key Files

| File | Responsibility |
|---|---|
| `App.jsx` | Root component. Owns all state: auth, progress, view routing, unlock logic. |
| `LibraryCacheGame.jsx` | The complete game — difficulty selection, question rendering, scoring, summary screen. |
| `PreAssessment.jsx` | Pre and post assessment quiz flow. |
| `GameConfigs.js` | Static definitions for all 9 difficulty configurations. |
| `api.js` | Thin fetch wrapper. Attaches JWT headers, parses JSON, throws on errors. |
| `App.css` | All global styles using a `bw-*` class naming convention. |
| `LibraryCacheGame.css` | Game-specific styles using a `lcg-*` class naming convention. |

### State Management

There is no external state library. All shared state lives in `App.jsx` as `useState` hooks and is passed down as props:

| State | Type | Description |
|---|---|---|
| `view` | string | Active screen: `"home"`, `"auth"`, `"game"`, `"pretest"`, `"posttest"` |
| `activeMode` | string | Which mode is being played (`"associative"`, `"direct"`, `"set"`) |
| `isLoggedIn` | boolean | Whether the user has a valid token |
| `user` | object | `{ id, username }` from `/api/auth/me` |
| `modeProgress` | object | Keyed by config ID (e.g. `associativeHard`); each value is `{ plays, accuracy, bestXp, complete }` |
| `preScore` | number\|null | Pre-assessment score; `null` means not yet taken |
| `postScore` | number\|null | Post-assessment score |
| `totalXp` | number | User's cumulative XP |

### Routing

Routing is purely state-driven — there is no React Router. `App.jsx` renders different components based on the `view` state:

```
view === "home"     → home page with mode cards
view === "auth"     → LoginPage
view === "pretest"  → PreAssessment (type="pre")
view === "posttest" → PreAssessment (type="post")
view === "game"     → LibraryCacheGame
```

### API Communication

All API calls go through `api.js`. The base URL defaults to `http://localhost:4000/api` and can be overridden with the `VITE_API_URL` environment variable. The JWT token is stored in `localStorage` under the key `bw_token` and automatically attached to every request.

---

## 3. Backend

**Stack:** Node.js, Express 4, CommonJS modules

### Entry Point

`server.js` connects to MongoDB then starts the Express server. On Vercel, `server.js` exports the Express `app` as a serverless handler instead — `app.listen()` is skipped.

### Request Lifecycle

```
Request
  → cors middleware          (checks CORS_ORIGIN)
  → express.json             (parses body, 32kb limit)
  → connect() middleware     (ensures MongoDB is connected)
  → router match             (/api/auth/*, /api/progress/*, etc.)
  → requireAuth (if needed)  (verifies JWT, sets req.user)
  → controller               (validates input, queries MongoDB, returns JSON)
  → errorHandler             (catches any thrown error, returns JSON)
```

### Controllers

Each controller owns input validation and all database logic for its resource:

| Controller | Routes | Key operations |
|---|---|---|
| `auth` | `/api/auth/*` | Register (hash password, insert user), login (compare hash, sign JWT), `/me` (return user from token) |
| `progress` | `/api/progress/*` | Save session (insert document, increment XP if improved), summary (aggregate by modeId), recent activity feed |
| `assessment` | `/api/assessment/*` | Upsert pre/post score, return both scores |
| `leaderboard` | `/api/leaderboard` | Sort users by `totalXp` descending |
| `stats` | `/api/stats/overview` | Global aggregates: total plays, total XP, average accuracy |

### Auth Middleware

`requireAuth` in `src/middleware/auth.js` extracts the Bearer token from the `Authorization` header, verifies it with `jsonwebtoken`, and sets `req.user = { id }`. Any controller on a protected route can read `req.user.id`.

---

## 4. Database

**MongoDB Atlas** — database name: `bitwise`

### Collections

#### `users`
```
{
  _id:          ObjectId,
  username:     String (unique, case-insensitive index),
  passwordHash: String,
  totalXp:      Number,
  createdAt:    Date
}
```

#### `sessions`
One document per completed game attempt.
```
{
  _id:       ObjectId,
  userId:    ObjectId  → users._id,
  gameId:    String    (e.g. "cache"),
  modeId:    String    (e.g. "associativeHard"),
  score:     Number,
  accuracy:  Number    (0–1),
  xpEarned:  Number,
  createdAt: Date
}
```

#### `assessments`
One document per user per type (upserted, not appended).
```
{
  _id:            ObjectId,
  userId:         ObjectId  → users._id,
  type:           String    ("pre" | "post"),
  score:          Number,
  totalQuestions: Number,
  xpEarned:       Number,
  createdAt:      Date
}
```

### Indexes

| Collection | Index | Purpose |
|---|---|---|
| `users` | `username` (unique) | Fast login lookup, enforce uniqueness |
| `sessions` | `userId` | All sessions for one user |
| `sessions` | `userId + gameId` | Per-mode aggregation |
| `sessions` | `createdAt DESC` | Activity feed |
| `assessments` | `userId + type` | Pre/post lookup per user |

### Key Aggregation

`GET /api/progress/me` runs a MongoDB aggregation that groups all of a user's sessions by `modeId`:

```js
{ $match: { userId } }
{ $group: {
    _id:     '$modeId',
    bestXp:  { $max: '$xpEarned' },
    plays:   { $sum: 1 },
    accuracy:{ $max: '$accuracy' },  // best accuracy ever for that config
}}
```

This returns one entry per config ID (e.g. `associativeHard`, `directEasy`). The result is returned as `perMode` — a flat object with all 9 keys — which the frontend uses to determine unlock state.

---

## 5. Authentication

- Passwords are hashed with **bcrypt** at cost factor 10 before storage.
- On login, the backend signs a **JWT** (HS256) with payload `{ uid: user._id }` and a 7-day expiry.
- The frontend stores the token in `localStorage` (`bw_token`) and sends it as `Authorization: Bearer <token>` on every protected request.
- `requireAuth` middleware verifies the token and attaches `req.user = { id }` before the controller runs.
- On logout, the frontend deletes the token from `localStorage` and resets all state.

---

## 6. Game Logic & Unlock System

### Game Configurations

All game content is defined statically in `GameConfigs.js`. There are **9 configurations** across 3 modes × 3 difficulties:

| Config ID | Mode | Difficulty |
|---|---|---|
| `associativeEasy` | Fully Associative | Easy |
| `associativeMedium` | Fully Associative | Medium |
| `associativeHard` | Fully Associative | Hard |
| `directEasy` | Direct Mapping | Easy |
| `directMedium` | Direct Mapping | Medium |
| `directHard` | Direct Mapping | Hard |
| `setEasy` | Set-Associative | Easy |
| `setMedium` | Set-Associative | Medium |
| `setHard` | Set-Associative | Hard |

Each config defines the cache parameters: number of lines, tag/index/set/offset bit widths, and whether address labels are hidden.

### Question Generation

Questions are generated **entirely client-side** in `LibraryCacheGame.jsx` using the config parameters — no backend call is made during gameplay. Each question randomly generates a binary memory address, determines whether it is a cache hit or miss based on the simulated cache state, and records the correct answer.

### Unlock Logic

Unlock state is computed in `App.jsx` from `modeProgress` on every render — it is never stored:

```
Pre-assessment required → to access any mode

Within a mode:
  Easy     → always available once mode is unlocked
  Medium   → Easy accuracy ≥ 80%
  Hard     → Medium accuracy ≥ 80%

Between modes:
  Fully Associative → pre-assessment complete
  Direct Mapping    → associativeHard accuracy ≥ 80%
  Set-Associative   → directHard accuracy ≥ 80%

Post-assessment:
  → associativeHard AND directHard AND setHard all ≥ 80%
```

Since `accuracy` in `modeProgress` is the `$max` across all sessions for that config ID, unlocks are permanent once earned.

### XP System

XP is only awarded for **improvement**, not for repetition:

1. On game completion, the frontend posts `{ modeId, score, accuracy, xpEarned }` to `/api/progress`.
2. The backend queries the highest `xpEarned` previously recorded for that `modeId`.
3. Only `max(0, newXpEarned - previousBest)` is added to the user's `totalXp`.
4. Replaying a completed mode without improving score earns 0 XP.

---

## 7. Data Flow

### Login

```
User submits credentials
  → POST /api/auth/login
  → Backend verifies bcrypt hash
  → Returns JWT
  → Frontend stores token in localStorage
  → Frontend calls GET /api/auth/me + GET /api/progress/me + GET /api/assessment/me
  → App state populated, UI re-renders
```

### Completing a Game

```
User finishes 10 questions in LibraryCacheGame
  → postProgress() called with { modeId, score, accuracy, xpEarned }
  → POST /api/progress (backend saves session, increments XP if improved)
  → User clicks Home
  → loadUserData() called: GET /api/progress/me + GET /api/assessment/me
  → modeProgress state updated
  → Unlock logic re-evaluates → newly unlocked difficulties/modes appear immediately
```

### Pre/Post Assessment

```
User completes quiz in PreAssessment.jsx
  → submitAssessment(type, score, totalQuestions) called
  → POST /api/assessment (backend upserts score for that type)
  → onComplete() callback fires
  → loadUserData() refreshes state
  → Home re-renders with updated pre/post score
```

---

## 8. Deployment

Both frontend and backend are deployed on **Vercel**.

### Frontend
Standard Vite static build. Vercel serves `frontend/dist/` as a CDN-cached SPA. The `VITE_API_URL` environment variable points to the production backend URL.

### Backend
`server.js` exports the Express app. Vercel treats it as a serverless function — a new function instance handles each request. Because instances are stateless, the MongoDB connection middleware (`connect()`) runs on every request, but the `MongoClient` instance is reused across warm invocations via module-level caching.

### Environment Variables (Production)

Set these in the Vercel dashboard for the backend project:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Long random string |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `CORS_ORIGIN` | Frontend Vercel URL (e.g. `https://bitwise-jet.vercel.app`) |

---

## 9. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Local HTTP port |
| `JWT_SECRET` | Yes | — | HS256 signing key — server won't start without it |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed frontend origin |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:4000/api` | Backend base URL |
