const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');

const absPath = path.resolve(DB_PATH);
fs.mkdirSync(path.dirname(absPath), { recursive: true });

const db = new Database(absPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS play_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id    TEXT    NOT NULL,
    score      INTEGER NOT NULL,
    accuracy   REAL    NOT NULL,
    xp_earned  INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user      ON play_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_game ON play_sessions(user_id, game_id);

  CREATE TABLE IF NOT EXISTS questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    TEXT    NOT NULL,
    type       TEXT    NOT NULL,
    payload    TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_questions_game_type ON questions(game_id, type, sort_order);

  CREATE TABLE IF NOT EXISTS games (
    id           TEXT    PRIMARY KEY,
    title        TEXT    NOT NULL,
    tag          TEXT    NOT NULL,
    icon         TEXT    NOT NULL,
    color        TEXT    NOT NULL,
    color_dim    TEXT    NOT NULL,
    color_border TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    badges       TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'playable',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

// ── Migration: drop strict CHECK (game_id IN ('cache','spell')) so new games work
function rebuildIfHasStrictCheck(table, createSql) {
  const meta = db
    .prepare(`SELECT sql FROM sqlite_schema WHERE type='table' AND name=?`)
    .get(table);
  if (!meta || !meta.sql) return false;
  if (!/CHECK\s*\(\s*game_id\s+IN\b/i.test(meta.sql)) return false;

  const tmp = `${table}_new`;
  const cols =
    table === 'play_sessions'
      ? 'id, user_id, game_id, score, accuracy, xp_earned, created_at'
      : 'id, game_id, type, payload, sort_order, created_at';

  db.exec('PRAGMA foreign_keys = OFF;');
  const tx = db.transaction(() => {
    db.exec(createSql.replace(table, tmp));
    db.exec(`INSERT INTO ${tmp} (${cols}) SELECT ${cols} FROM ${table};`);
    db.exec(`DROP TABLE ${table};`);
    db.exec(`ALTER TABLE ${tmp} RENAME TO ${table};`);
  });
  tx();
  db.exec('PRAGMA foreign_keys = ON;');
  return true;
}

rebuildIfHasStrictCheck(
  'play_sessions',
  `CREATE TABLE play_sessions (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     game_id    TEXT    NOT NULL,
     score      INTEGER NOT NULL,
     accuracy   REAL    NOT NULL,
     xp_earned  INTEGER NOT NULL,
     created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
   );`
);
rebuildIfHasStrictCheck(
  'questions',
  `CREATE TABLE questions (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     game_id    TEXT    NOT NULL,
     type       TEXT    NOT NULL,
     payload    TEXT    NOT NULL,
     sort_order INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
   );`
);

// Re-create indexes if they were dropped along with the tables
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_user      ON play_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_game ON play_sessions(user_id, game_id);
  CREATE INDEX IF NOT EXISTS idx_questions_game_type ON questions(game_id, type, sort_order);
`);

// ── Question seed
function loadQuestionSeed() {
  const seedPath = path.join(path.dirname(absPath), 'questions.seed.json');
  if (!fs.existsSync(seedPath)) return [];
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const rows = [];
  for (const gameId of Object.keys(raw)) {
    for (const type of Object.keys(raw[gameId])) {
      raw[gameId][type].forEach((entry, i) => {
        rows.push({ gameId, type, payload: JSON.stringify(entry), sortOrder: i });
      });
    }
  }
  return rows;
}

function seedQuestions({ truncate = false } = {}) {
  const rows = loadQuestionSeed();
  if (rows.length === 0) return { inserted: 0, skipped: true };

  const insert = db.prepare(
    'INSERT INTO questions (game_id, type, payload, sort_order) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((items) => {
    if (truncate) db.prepare('DELETE FROM questions').run();
    for (const r of items) insert.run(r.gameId, r.type, r.payload, r.sortOrder);
  });
  tx(rows);
  return { inserted: rows.length, skipped: false };
}

function seedQuestionsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM questions').get();
  if (count > 0) return { inserted: 0, skipped: true };
  return seedQuestions({ truncate: false });
}

// ── Games seed
function loadGamesSeed() {
  const seedPath = path.join(path.dirname(absPath), 'games.seed.json');
  if (!fs.existsSync(seedPath)) return [];
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

function seedGames({ truncate = false } = {}) {
  const rows = loadGamesSeed();
  if (rows.length === 0) return { inserted: 0, skipped: true };

  const insert = db.prepare(
    `INSERT INTO games (id, title, tag, icon, color, color_dim, color_border, description, badges, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction((items) => {
    if (truncate) db.prepare('DELETE FROM games').run();
    for (const r of items) {
      insert.run(
        r.id,
        r.title,
        r.tag,
        r.icon,
        r.color,
        r.colorDim,
        r.colorBorder,
        r.description,
        JSON.stringify(r.badges || []),
        r.status || 'playable',
        r.sortOrder ?? 0
      );
    }
  });
  tx(rows);
  return { inserted: rows.length, skipped: false };
}

function seedGamesIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM games').get();
  if (count > 0) return { inserted: 0, skipped: true };
  return seedGames({ truncate: false });
}

seedQuestionsIfEmpty();
seedGamesIfEmpty();

module.exports = db;
module.exports.seedQuestions = seedQuestions;
module.exports.seedQuestionsIfEmpty = seedQuestionsIfEmpty;
module.exports.seedGames = seedGames;
module.exports.seedGamesIfEmpty = seedGamesIfEmpty;
