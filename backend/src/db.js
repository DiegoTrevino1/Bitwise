const { MongoClient, ObjectId } = require('mongodb');
const { MONGODB_URI } = require('./config');

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('bitwise');
  await db.collection('users').createIndex({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
  await db.collection('sessions').createIndex({ userId: 1 });
  await db.collection('sessions').createIndex({ userId: 1, gameId: 1 });
  await db.collection('sessions').createIndex({ createdAt: -1 });
  await db.collection('assessments').createIndex({ userId: 1, type: 1 });
  console.log('✅ MongoDB connected:', db.databaseName);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connect() first.');
  return db;
}

function collections() {
  const d = getDb();
  return {
    users:       d.collection('users'),
    sessions:    d.collection('sessions'),
    assessments: d.collection('assessments'),
  };
}

module.exports = { connect, getDb, collections, ObjectId };
