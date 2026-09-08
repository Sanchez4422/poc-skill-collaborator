const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'data', 'db.json');
const adapter = new FileSync(dbFile);
const db = low(adapter);

db.defaults({
  users: [],
  posts: [],
  stories: [],
  messages: [],
  notifications: []
}).write();

module.exports = db;
