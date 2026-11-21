const http = require('node:http');
const db = require('./db');

const base = '/api/students';
const byId = db.prepare('SELECT * FROM students WHERE id = ?');
const all = db.prepare('SELECT * FROM students ORDER BY id');
const create = db.prepare('INSERT INTO students (name, rollNo, department, semester) VALUES (?, ?, ?, ?) RETURNING *');
const replace = db.prepare('UPDATE students SET name=?, rollNo=?, department=?, semester=? WHERE id=? RETURNING *');
const remove = db.prepare('DELETE FROM students WHERE id=?');

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function readStudent(req) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'Use Content-Type application/json.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 16384) { req.resume(); throw new ApiError(413, 'Body exceeds 16 KiB.'); }
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'Malformed JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError(400, 'Expected a JSON object.');
  const fields = ['name', 'rollNo', 'department', 'semester'];
  if (Object.keys(data).some(key => !fields.includes(key))) throw new ApiError(400, 'Unexpected field.');
  for (const field of fields.slice(0, 3)) {
    const limit = field === 'rollNo' ? 32 : 100;
    if (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > limit) {
      throw new ApiError(400, field + ' must contain 1 to ' + limit + ' characters.');
    }
    data[field] = data[field].trim();
  }
  if (!Number.isInteger(data.semester) || data.semester < 1 || data.semester > 8) {
    throw new ApiError(400, 'semester must be an integer from 1 to 8.');
  }
  return fields.map(field => data[field]);
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, body === undefined ? headers : { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  try {
    const pathname = req.url.split('?')[0].replace(/\/$/, '');
    const match = /^\/api\/students(?:\/([^/]+))?$/.exec(pathname);
    if (!match) throw new ApiError(404, 'Route not found.');
    const hasId = match[1] !== undefined;
    const id = Number(match[1]);
    if (hasId && (!/^[1-9]\d*$/.test(match[1]) || !Number.isSafeInteger(id))) throw new ApiError(400, 'ID must be a positive integer.');
    const allowed = hasId ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST'];
    if (!allowed.includes(req.method)) return send(res, 405, { error: 'Method not allowed.' }, { Allow: allowed.join(', ') });
    if (req.method === 'POST') {
      const record = create.get(...await readStudent(req));
      return send(res, 201, record, { Location: base + '/' + record.id });
    }
    if (!hasId) return send(res, 200, all.all());
    let record;
    if (req.method === 'DELETE') {
      if (remove.run(id).changes) return send(res, 204);
    } else if (req.method === 'PUT') {
      record = replace.get(...await readStudent(req), id);
    } else {
      record = byId.get(id);
    }
    if (!record) throw new ApiError(404, 'Student not found.');
    send(res, 200, record);
  } catch (err) {
    if (err.errcode === 2067) return send(res, 409, { error: 'Roll number already exists.' });
    if (!err.status) console.error(err);
    send(res, err.status || 500, { error: err.status ? err.message : 'Database or server error.' });
  }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
  console.log('Student API listening at http://localhost:' + server.address().port + base);
});
