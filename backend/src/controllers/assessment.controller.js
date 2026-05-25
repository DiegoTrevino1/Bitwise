const { collections, ObjectId } = require('../db');

// 10 XP per correct answer for both pre and post assessments
const ASSESSMENT_XP_PER_CORRECT = 10;

async function submit(req, res) {
  const { type, score, totalQuestions } = req.body || {};

  if (!['pre', 'post'].includes(type))
    return res.status(400).json({ error: 'type must be "pre" or "post"' });
  if (typeof score !== 'number' || score < 0)
    return res.status(400).json({ error: 'invalid score' });
  if (typeof totalQuestions !== 'number' || totalQuestions < 1)
    return res.status(400).json({ error: 'invalid totalQuestions' });

  const userId  = new ObjectId(req.user.id);
  const xpEarned = score * ASSESSMENT_XP_PER_CORRECT;
  const { users, assessments } = collections();

  // Check if already submitted this type — only keep best
  const existing = await assessments.findOne({ userId, type });
  const isImprovement = !existing || score > existing.score;
  const xpImprovement = existing ? Math.max(0, xpEarned - (existing.xpEarned || 0)) : xpEarned;

  // Upsert the assessment result
  await assessments.updateOne(
    { userId, type },
    {
      $set: {
        score,
        totalQuestions,
        xpEarned,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // Award improvement XP to user
  if (xpImprovement > 0) {
    await users.updateOne(
      { _id: userId },
      { $inc: { totalXp: xpImprovement } }
    );
  }

  return res.status(201).json({
    ok: true,
    score,
    xpEarned: xpImprovement,
    isImprovement,
  });
}

async function getResults(req, res) {
  const userId = new ObjectId(req.user.id);
  const results = await collections().assessments
    .find({ userId })
    .toArray();

  const out = {};
  for (const r of results) {
    out[r.type] = {
      score:          r.score,
      totalQuestions: r.totalQuestions,
      xpEarned:       r.xpEarned,
      takenAt:        r.updatedAt || r.createdAt,
    };
  }

  // Calculate improvement if both exist
  if (out.pre && out.post) {
    out.improvement = out.post.score - out.pre.score;
  }

  return res.json(out);
}

module.exports = { submit, getResults };
