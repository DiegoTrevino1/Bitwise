require('dotenv').config();

const PORT = parseInt(process.env.PORT, 10) || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || './data/app.db';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Copy .env.example to .env and set it.');
}

module.exports = { PORT, JWT_SECRET, DB_PATH, CORS_ORIGIN };
