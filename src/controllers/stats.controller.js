const db = require('../db');

const overviewQuery = db.prepare(
  `SELECT
     (SELECT COUNT(*) FROM users)                                AS users,
     (SELECT COUNT(*) FROM play_sessions)                        AS plays,
     (SELECT COALESCE(SUM(xp_earned), 0) FROM play_sessions)     AS total_xp,
     (SELECT COALESCE(AVG(accuracy), 0) FROM play_sessions)      AS avg_accuracy`
);

const topScorerQuery = db.prepare(
  `SELECT u.username, COALESCE(SUM(s.xp_earned), 0) AS total_xp
   FROM users u
   LEFT JOIN play_sessions s ON s.user_id = u.id
   GROUP BY u.id
   ORDER BY total_xp DESC, u.id ASC
   LIMIT 1`
);

function overview(req, res) {
  const row = overviewQuery.get();
  const top = topScorerQuery.get();
  return res.json({
    users: row.users,
    plays: row.plays,
    totalXp: row.total_xp,
    avgAccuracy: Number(row.avg_accuracy.toFixed(4)),
    topScorer: top && top.total_xp > 0
      ? { username: top.username, totalXp: top.total_xp }
      : null,
  });
}

module.exports = { overview };
