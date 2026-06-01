const bcrypt = require('bcryptjs');
const { collections, ObjectId } = require('../db');
const { sign } = require('../utils/jwt');

function validateCredentials(body) {
  if (!body || typeof body !== 'object') return 'invalid body';
  const { username, password } = body;
  if (typeof username !== 'string' || username.trim().length < 3 || username.length > 32)
    return 'username must be 3–32 characters';
  if (!/^[A-Za-z0-9_.-]+$/.test(username.trim()))
    return 'username may only contain letters, numbers, underscore, dot, hyphen';
  if (typeof password !== 'string' || password.length < 6 || password.length > 200)
    return 'password must be 6–200 characters';
  return null;
}

async function register(req, res) {
  const err = validateCredentials(req.body);
  if (err) return res.status(400).json({ error: err });

  const username     = req.body.username.trim();
  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const { users }    = collections();

  try {
    const result = await users.insertOne({ username, passwordHash, totalXp: 0, createdAt: new Date() });
    const user   = { id: result.insertedId.toString(), username };
    return res.status(201).json({ token: sign(user.id), user });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'username already taken' });
    throw e;
  }
}

async function login(req, res) {
  const err = validateCredentials(req.body);
  if (err) return res.status(400).json({ error: err });

  const { users } = collections();
  const row = await users.findOne(
    { username: req.body.username.trim() },
    { collation: { locale: 'en', strength: 2 } }
  );
  if (!row) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(req.body.password, row.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const user = { id: row._id.toString(), username: row.username };
  return res.json({ token: sign(user.id), user });
}

async function me(req, res) {
  const { users } = collections();
  const row = await users.findOne({ _id: new ObjectId(req.user.id) });
  if (!row) return res.status(404).json({ error: 'user not found' });
  return res.json({ id: row._id.toString(), username: row.username });
}

module.exports = { register, login, me };
