const { collections, ObjectId } = require('../db');

const MODE_IDS = [
  'associativeEasy', 'associativeMedium', 'associativeHard',
  'directEasy', 'directMedium', 'directHard',
  'setEasy', 'setMedium', 'setHard',
];
const MODE_LABELS = {
  associativeEasy: 'Fully Associative Easy', associativeMedium: 'Fully Associative Medium', associativeHard: 'Fully Associative Hard',
  directEasy: 'Direct Mapping Easy', directMedium: 'Direct Mapping Medium', directHard: 'Direct Mapping Hard',
  setEasy: 'Set-Associative Easy', setMedium: 'Set-Associative Medium', setHard: 'Set-Associative Hard',
};

async function record(req, res) {
  const { gameId, modeId, score, accuracy, xpEarned } = req.body || {};

  if (typeof gameId !== 'string' || !gameId)
    return res.status(400).json({ error: 'invalid gameId' });
  if (!MODE_IDS.includes(modeId))
    return res.status(400).json({ error: 'invalid modeId' });
  if (!Number.isFinite(score) || score < 0)
    return res.status(400).json({ error: 'invalid score' });
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1)
    return res.status(400).json({ error: 'accuracy must be 0–1' });
  if (!Number.isFinite(xpEarned) || xpEarned < 0)
    return res.status(400).json({ error: 'invalid xpEarned' });

  const userId = new ObjectId(req.user.id);
  const { users, sessions } = collections();

  // Only award improvement XP over the user's previous best for this mode
  const prevBest = await sessions
    .find({ userId, modeId })
    .sort({ xpEarned: -1 })
    .limit(1)
    .toArray();
  const prevBestXp    = prevBest[0]?.xpEarned ?? 0;
  const xpImprovement = Math.max(0, xpEarned - prevBestXp);

  await sessions.insertOne({ userId, gameId, modeId, score, accuracy, xpEarned, createdAt: new Date() });

  if (xpImprovement > 0) {
    await users.updateOne({ _id: userId }, { $inc: { totalXp: xpImprovement } });
  }

  return res.status(201).json({ ok: true, xpEarned: xpImprovement });
}

async function summary(req, res) {
  const userId = new ObjectId(req.user.id);
  const { users, sessions } = collections();

  const [user, modeAgg, totalUsers] = await Promise.all([
    users.findOne({ _id: userId }, { projection: { totalXp: 1 } }),
    sessions.aggregate([
      { $match: { userId } },
      { $group: {
        _id:         '$modeId',
        bestXp:      { $max: '$xpEarned' },
        plays:       { $sum: 1 },
        accuracy:    { $max: '$accuracy' },
      }},
    ]).toArray(),
    users.countDocuments(),
  ]);

  const totalXp = user?.totalXp ?? 0;
  const rank    = await users.countDocuments({ totalXp: { $gt: totalXp } }) + 1;

  const perMode = {};
  for (const id of MODE_IDS) perMode[id] = { bestXp: 0, plays: 0, accuracy: 0, complete: false };
  for (const r of modeAgg) {
    if (perMode[r._id] !== undefined) {
      perMode[r._id] = { bestXp: r.bestXp, plays: r.plays, accuracy: Number(r.accuracy.toFixed(4)), complete: true };
    }
  }

  return res.json({ totalXp, rank, totalUsers, perMode });
}

async function recent(req, res) {
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit)) limit = 10;
  limit = Math.min(50, Math.max(1, limit));

  const { users, sessions } = collections();
  const rows = await sessions.find({}).sort({ createdAt: -1 }).limit(limit).toArray();

  const userIds  = [...new Set(rows.map(r => r.userId.toString()))];
  const userDocs = await users
    .find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }, { projection: { username: 1 } })
    .toArray();
  const userMap = Object.fromEntries(userDocs.map(u => [u._id.toString(), u.username]));

  const now = Date.now();
  const out = rows.map(r => ({
    id:        r._id.toString(),
    username:  userMap[r.userId.toString()] || 'unknown',
    modeId:    r.modeId,
    modeLabel: MODE_LABELS[r.modeId] || r.modeId,
    score:     r.score,
    accuracy:  r.accuracy,
    xpEarned:  r.xpEarned,
    ts:        Math.round((now - new Date(r.createdAt).getTime()) / 1000),
  }));
  return res.json(out);
}

module.exports = { record, summary, recent };
