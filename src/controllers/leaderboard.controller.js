const db = require('../db');

const topQuery = db.prepare(
  `SELECT u.username, COALESCE(SUM(s.xp_earned), 0) AS total_xp
   FROM users u
   LEFT JOIN play_sessions s ON s.user_id = u.id
   GROUP BY u.id
   ORDER BY total_xp DESC, u.id ASC
   LIMIT ?`
);

function top(req, res) {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit)) limit = 10;
  limit = Math.min(100, Math.max(1, limit));

  const rows = topQuery.all(limit);
  const out = rows.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    totalXp: r.total_xp,
  }));
  return res.json(out);
}

module.exports = { top };
