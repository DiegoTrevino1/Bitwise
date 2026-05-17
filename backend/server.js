const app = require('./src/app');
const { PORT } = require('./src/config');

app.listen(PORT, () => {
  console.log(`Architects of Logic backend listening on http://localhost:${PORT}`);
});
