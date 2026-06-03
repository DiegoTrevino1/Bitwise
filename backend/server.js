const { connect } = require('./src/db');
const { PORT }    = require('./src/config');
const app         = require('./src/app');

// Local development only — Vercel does not use app.listen()
if (!process.env.VERCEL) {
  connect()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Bitwise backend running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

// Vercel serverless handler
module.exports = app;
