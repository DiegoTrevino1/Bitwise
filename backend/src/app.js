const express = require('express');
const cors    = require('cors');
const { CORS_ORIGIN } = require('./config');
const { connect } = require('./db');

const authRoutes        = require('./routes/auth.routes');
const progressRoutes    = require('./routes/progress.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const statsRoutes       = require('./routes/stats.routes');
const assessmentRoutes  = require('./routes/assessment.routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '32kb' }));

// Ensure MongoDB is connected on every request (required for Vercel serverless)
app.use(async (req, res, next) => {
  try { await connect(); next(); }
  catch (err) { res.status(503).json({ error: 'Database connection failed' }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth',        authRoutes);
app.use('/api/progress',    progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/stats',       statsRoutes);
app.use('/api/assessment',  assessmentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
