const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function sign(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { sign, verify };
