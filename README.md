# Architects of Logic — Frontend

CWU Computer Architecture learning app. Two interactive games (cache mapping and number systems / spell counter) with pre/post-assessments, XP scoring, and a class leaderboard.

## Stack

- React 19 + Vite 8
- Plain CSS per component (no framework)
- JWT auth against a separate backend at `http://localhost:4000/api`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

For auth, progress, and the leaderboard to work, the backend must be running at `http://localhost:4000`. Without it, the home screen still renders — fetches fail silently and the leaderboard shows an empty-state hint.

## Scripts

| Command           | What it does                    |
| ----------------- | ------------------------------- |
| `npm run dev`     | Vite dev server with HMR        |
| `npm run build`   | Production build → `dist/`      |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint`    | ESLint (flat config)            |

## Project layout

```
src/
├── main.jsx                # createRoot → <App />
├── App.jsx                 # View router + session shell + HomePage
├── api.js                  # fetch wrapper, JWT helpers, postProgress
├── LoginPage.jsx           # Login + register form
├── LibraryCacheGame.jsx    # Cache mapping game
├── SpellCounter.jsx        # Number systems combat game
└── *.css                   # One stylesheet per component
```

## Games

- **Library Cache Mapping Puzzle** — place 6-bit-addressed books into a 16-slot cache using Direct, Set-Associative, or Fully Associative mapping.
- **Spell Counter** — turn-based combat where enemies cast hex/binary spells. Counter with the correct numerical transformation; bit-level accuracy determines damage.

Both games post results to `POST /progress` when a round ends (no-op if logged out).

## Backend contract

| Method | Path                   | Auth |
| ------ | ---------------------- | ---- |
| POST   | `/auth/register`       | no   |
| POST   | `/auth/login`          | no   |
| GET    | `/auth/me`             | yes  |
| GET    | `/leaderboard?limit=N` | no   |
| GET    | `/progress/me`         | yes  |
| POST   | `/progress`            | yes  |

The base URL is hardcoded in `src/api.js` and needs to move to `import.meta.env.VITE_API_URL` before any non-local deploy.
