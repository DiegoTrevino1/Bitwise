const db = require('../db');

const isValidGameId = db.prepare(
  'SELECT 1 AS ok FROM games WHERE id = ? AND status = ? LIMIT 1'
);

function isPlayableGame(gameId) {
  if (typeof gameId !== 'string' || !gameId) return false;
  return !!isValidGameId.get(gameId, 'playable');
}

const insertSession = db.prepare(
  `INSERT INTO play_sessions (user_id, game_id, score, accuracy, xp_earned)
   VALUES (?, ?, ?, ?, ?)`
);
const getTotalXp = db.prepare(
  `SELECT COALESCE(SUM(xp_earned), 0) AS total_xp
   FROM play_sessions WHERE user_id = ?`
);
const getPerGame = db.prepare(
  `SELECT game_id,
          COALESCE(MAX(score), 0)    AS best_score,
          COUNT(*)                   AS plays,
          COALESCE(AVG(accuracy), 0) AS accuracy
   FROM play_sessions
   WHERE user_id = ?
   GROUP BY game_id`
);
const getUserCount = db.prepare(`SELECT COUNT(*) AS count FROM users`);
const getRankQuery = db.prepare(
  `SELECT 1 + COUNT(*) AS rank
   FROM (
     SELECT u.id, COALESCE(SUM(s.xp_earned), 0) AS total_xp
     FROM users u
     LEFT JOIN play_sessions s ON s.user_id = u.id
     GROUP BY u.id
   ) t
   WHERE t.total_xp > ? OR (t.total_xp = ? AND t.id < ?)`
);
const getRecentQuery = db.prepare(
  `SELECT s.id, s.game_id, s.score, s.accuracy, s.xp_earned, s.created_at,
          u.username
   FROM play_sessions s
   JOIN users u ON u.id = s.user_id
   ORDER BY s.created_at DESC, s.id DESC
   LIMIT ?`
);
const getPlayableGamesQuery = db.prepare(
  `SELECT id FROM games WHERE status = 'playable' ORDER BY sort_order, id`
);

function emptyGameStats() {
  return { bestScore: 0, plays: 0, accuracy: 0 };
}

function record(req, res) {
  const { gameId, score, accuracy, xpEarned } = req.body || {};

  if (!isPlayableGame(gameId)) {
    return res.status(400).json({ error: 'gameId is not a playable game' });
  }
  if (!Number.isFinite(score) || score < 0 || score > 100000) {
    return res.status(400).json({ error: 'score must be 0–100000' });
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    return res.status(400).json({ error: 'accuracy must be between 0 and 1' });
  }
  if (!Number.isFinite(xpEarned) || xpEarned < 0 || xpEarned > 100000) {
    return res.status(400).json({ error: 'xpEarned must be 0–100000' });
  }

  const result = insertSession.run(
    req.user.id,
    gameId,
    Math.round(score),
    accuracy,
    Math.round(xpEarned)
  );
  return res.status(201).json({ ok: true, sessionId: result.lastInsertRowid });
}

function summary(req, res) {
  const { total_xp } = getTotalXp.get(req.user.id);
  const rows = getPerGame.all(req.user.id);
  const { count: totalUsers } = getUserCount.get();
  const { rank } = getRankQuery.get(total_xp, total_xp, req.user.id);

  const perGame = {};
  for (const g of getPlayableGamesQuery.all()) {
    perGame[g.id] = emptyGameStats();
  }
  for (const r of rows) {
    perGame[r.game_id] = {
      bestScore: r.best_score,
      plays: r.plays,
      accuracy: Number(r.accuracy.toFixed(4)),
    };
  }
  return res.json({ totalXp: total_xp, rank, totalUsers, perGame });
}

function recent(req, res) {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit)) limit = 10;
  limit = Math.min(50, Math.max(1, limit));

  const rows = getRecentQuery.all(limit);
  const out = rows.map((r) => ({
    id: r.id,
    username: r.username,
    gameId: r.game_id,
    score: r.score,
    accuracy: Number(r.accuracy.toFixed(4)),
    xpEarned: r.xp_earned,
    createdAt: r.created_at,
  }));
  return res.json(out);
}

module.exports = { record, summary, recent };
