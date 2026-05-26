require('dotenv').config();

const PORT        = parseInt(process.env.PORT, 10) || 4000;
const JWT_SECRET  = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

if (!JWT_SECRET)  throw new Error('JWT_SECRET is required. Set it in .env');
if (!MONGODB_URI) throw new Error('MONGODB_URI is required. Set it in .env');

module.exports = { PORT, JWT_SECRET, MONGODB_URI, CORS_ORIGIN };
