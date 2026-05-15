const { verify } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing bearer token' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verify(token);
    req.user = { id: payload.uid };
    next();
  } catch {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { requireAuth };
