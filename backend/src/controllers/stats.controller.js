const { collections } = require('../db');

async function overview(req, res) {
  const { users, sessions } = collections();

  const [userCount, sessionAgg, topUser] = await Promise.all([
    users.countDocuments(),
    sessions.aggregate([
      { $group: {
        _id:         null,
        plays:       { $sum: 1 },
        totalXp:     { $sum: '$xpEarned' },
        avgAccuracy: { $avg: '$accuracy' },
      }},
    ]).toArray(),
    users.findOne({}, { sort: { totalXp: -1 }, projection: { username: 1, totalXp: 1 } }),
  ]);

  const agg = sessionAgg[0] || { plays: 0, totalXp: 0, avgAccuracy: 0 };

  return res.json({
    users:       userCount,
    plays:       agg.plays,
    totalXp:     agg.totalXp,
    avgAccuracy: Number((agg.avgAccuracy || 0).toFixed(4)),
    topScorer:   topUser && topUser.totalXp > 0
      ? { username: topUser.username, totalXp: topUser.totalXp }
      : null,
  });
}

module.exports = { overview };
