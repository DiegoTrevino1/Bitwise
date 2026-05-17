# Bitwise — CWU Computer Architecture

Interactive cache mapping game with pre/post assessments and a class leaderboard.

## Project structure

```
Bitwise/
├── frontend/   React + Vite app
└── backend/    Node.js + Express API
```

## Running the project

Open **two terminals** side by side.

### Terminal 1 — Backend
```bash
cd backend
npm install
cp .env.example .env    # then fill in your DB credentials
npm run seed            # seed the database (first time only)
npm start               # runs on http://localhost:4000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.
