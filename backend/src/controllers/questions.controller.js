const db = require('../db');

const isGameId = db.prepare('SELECT 1 AS ok FROM games WHERE id = ? LIMIT 1');
const VALID_TYPES = new Set(['request', 'pretest', 'enemy']);

const listQuery = db.prepare(
  `SELECT id, payload, sort_order
   FROM questions
   WHERE game_id = ? AND type = ?
   ORDER BY sort_order, id`
);

function list(req, res) {
  const { gameId, type } = req.params;

  if (typeof gameId !== 'string' || !isGameId.get(gameId)) {
    return res.status(400).json({ error: 'unknown gameId' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: "type must be 'request', 'pretest', or 'enemy'" });
  }

  const rows = listQuery.all(gameId, type);
  const out = rows.map((r) => ({
    id: r.id,
    payload: JSON.parse(r.payload),
    sortOrder: r.sort_order,
  }));
  return res.json(out);
}

module.exports = { list };
