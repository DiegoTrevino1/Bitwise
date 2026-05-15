function notFound(req, res) {
  res.status(404).json({ error: 'not found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.expose ? err.message : (status >= 500 ? 'internal error' : err.message) });
}

module.exports = { notFound, errorHandler };
