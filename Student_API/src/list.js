const db = require('./db');
console.table(db.prepare('SELECT * FROM students ORDER BY id').all());
db.close();
