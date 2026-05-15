const db = require('../db');

const listQuery = db.prepare(
  `SELECT id, title, tag, icon, color, color_dim, color_border,
          description, badges, status, sort_order
   FROM games
   ORDER BY sort_order, id`
);

function list(req, res) {
  const rows = listQuery.all();
  const out = rows.map((r) => ({
    id: r.id,
    title: r.title,
    tag: r.tag,
    icon: r.icon,
    color: r.color,
    colorDim: r.color_dim,
    colorBorder: r.color_border,
    description: r.description,
    badges: JSON.parse(r.badges || '[]'),
    status: r.status,
    sortOrder: r.sort_order,
  }));
  return res.json(out);
}

module.exports = { list };
