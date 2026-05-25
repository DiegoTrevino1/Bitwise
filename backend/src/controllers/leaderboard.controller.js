const { collections } = require('../db');

async function top(req, res) {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit)) limit = 10;
  limit = Math.min(100, Math.max(1, limit));

  const { users } = collections();
  const rows = await users
    .find({}, { projection: { username: 1, totalXp: 1 } })
    .sort({ totalXp: -1, _id: 1 })
    .limit(limit)
    .toArray();

  const out = rows.map((r, i) => ({
    rank:     i + 1,
    username: r.username,
    totalXp:  r.totalXp || 0,
  }));
  return res.json(out);
}

module.exports = { top };
