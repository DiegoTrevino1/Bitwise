# Bitwise — Frontend

React + Vite frontend for **Bitwise**, a cache mapping learning app built for CWU Computer Architecture. Students take a pre-assessment, play through three cache mapping game modes, then retake the assessment to measure how much they learned.

## Stack

- React 18, Vite
- CSS (custom design system, Duolingo-inspired, all classes prefixed `bw-`)
- Fonts: Outfit (display), JetBrains Mono (code/numbers)

## Quick start

```sh
npm install
npm run dev     # starts at http://localhost:5173
```

Requires the backend to be running at `http://localhost:4000`. See `backend/README.md`.

## Environment variables

Create a `.env.local` file in this folder if you need to point at a different backend:

```
VITE_API_URL=http://localhost:4000/api
```

In production (Vercel), set `VITE_API_URL` to your deployed backend URL. If the variable is not set, it falls back to `http://localhost:4000/api` automatically.

## App flow

1. **Pre-assessment** — 10 questions on cache mapping concepts. Must be completed before any game mode is accessible.
2. **Game modes** — three modes that must be played in order. Each unlocks only when the previous mode's best accuracy is **80% or above**:
   - Mode 1: Fully Associative
   - Mode 2: Direct Mapping *(unlocks after 80%+ on Mode 1)*
   - Mode 3: Set-Associative *(unlocks after 80%+ on Mode 2)*
3. **Post-assessment** — same 10 questions, unlocks after all three modes are complete. Score is compared to pre-assessment to show improvement.

## XP system

| Activity          | XP per correct answer |
| ----------------- | --------------------- |
| Pre/Post assessment | 10 XP               |
| Fully Associative   | 30 XP               |
| Direct Mapping      | 10 XP               |
| Set-Associative     | 20 XP               |

Only **improvement XP** is awarded on replays (new best minus previous best). Total XP is tracked on a shared class leaderboard.

## Key files

```
src/
  App.jsx              Main app — all views and data loading
  App.css              Design system (bw- prefixed classes)
  api.js               All API calls to the backend
  LibraryCacheGame.jsx Cache mapping game (all 3 modes)
  PreAssessment.jsx    Pre and post assessment component
  LoginPage.jsx        Login and register form
```

## Deployment (Vercel)

Import the `frontend/` folder as a Vercel project and set:

- `VITE_API_URL` → your deployed backend URL (e.g. `https://your-backend.vercel.app/api`)

## Scripts

| Command         | What it does                     |
| --------------- | -------------------------------- |
| `npm run dev`   | Start dev server at port 5173    |
| `npm run build` | Build for production             |
| `npm run preview` | Preview the production build   |
