const bcrypt = require('bcrypt');
const db = require('../db');
const { sign } = require('../utils/jwt');

const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);
const getUserByName = db.prepare(
  'SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE'
);
const getUserById = db.prepare(
  'SELECT id, username FROM users WHERE id = ?'
);

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function validateCredentials(body) {
  if (!body || typeof body !== 'object') return 'invalid body';
  const { username, password } = body;
  if (typeof username !== 'string' || username.trim().length < 3 || username.length > 32) {
    return 'username must be 3–32 characters';
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    return 'username may only contain letters, numbers, underscore, dot, hyphen';
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return 'password must be 6–200 characters';
  }
  return null;
}

async function register(req, res) {
  const err = validateCredentials(req.body);
  if (err) return badRequest(res, err);

  const username = req.body.username.trim();
  const password = req.body.password;
  const hash = await bcrypt.hash(password, 10);

  let result;
  try {
    result = insertUser.run(username, hash);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'username already taken' });
    }
    throw e;
  }
  const user = { id: result.lastInsertRowid, username };
  return res.status(201).json({ token: sign(user.id), user });
}

async function login(req, res) {
  const err = validateCredentials(req.body);
  if (err) return badRequest(res, err);

  const row = getUserByName.get(req.body.username.trim());
  if (!row) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(req.body.password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  return res.json({ token: sign(row.id), user: { id: row.id, username: row.username } });
}

function me(req, res) {
  const row = getUserById.get(req.user.id);
  if (!row) return res.status(404).json({ error: 'user not found' });
  return res.json(row);
}

module.exports = { register, login, me };
