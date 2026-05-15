const db = require('../db');

const qResult = db.seedQuestions({ truncate: true });
console.log(`Seeded ${qResult.inserted} question rows (truncated existing).`);

const gResult = db.seedGames({ truncate: true });
console.log(`Seeded ${gResult.inserted} game rows (truncated existing).`);

process.exit(0);
