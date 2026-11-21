const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

const filename = process.env.STUDENT_DB || path.join(__dirname, '..', 'data', 'students.sqlite');
mkdirSync(path.dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec(`CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  rollNo TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(rollNo) BETWEEN 1 AND 32),
  department TEXT NOT NULL CHECK(length(trim(department)) BETWEEN 1 AND 100),
  semester INTEGER NOT NULL CHECK(semester BETWEEN 1 AND 8)
) STRICT`);
module.exports = db;
