/*
 * Student Hub launcher and frontend server.
 *
 * Running this one file starts everything:
 *   1. Checks whether the Student API is already running on API_PORT.
 *   2. If not, starts it automatically from the sibling Student_API folder.
 *   3. Serves the UI from ./public on PORT (default 5173).
 *   4. Proxies every /api/* request from the browser to the API.
 *
 * Uses only built-in Node.js modules: no npm install required.
 */
const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 5173);
const API_HOST = process.env.API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.API_PORT || 3000);
const API_DIR = process.env.API_DIR || path.join(__dirname, '..', 'Student_API');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/* ---------- API launcher ---------- */
let apiProcess = null;

function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

function waitForPort(port, host, timeoutMs = 10000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const check = async () => {
      if (await isPortOpen(port, host)) return resolve(true);
      if (Date.now() - started > timeoutMs) return resolve(false);
      setTimeout(check, 200);
    };
    check();
  });
}

async function startApiIfNeeded() {
  if (await isPortOpen(API_PORT, API_HOST)) {
    console.log(`Student API already running on port ${API_PORT}. Using it.`);
    return;
  }

  const entry = path.join(API_DIR, 'src', 'server.js');
  if (!fs.existsSync(entry)) {
    console.warn(`Could not find the API at ${entry}.`);
    console.warn('Start the API manually, or keep Student_API next to Student_Frontend.');
    return;
  }

  console.log('Starting Student API...');
  apiProcess = spawn(process.execPath, [entry], {
    cwd: API_DIR,
    env: { ...process.env, PORT: String(API_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  apiProcess.stdout.on('data', (d) => process.stdout.write('[API] ' + d));
  apiProcess.stderr.on('data', (d) => process.stderr.write('[API] ' + d));
  apiProcess.on('exit', (code) => {
    if (code !== null) console.error(`[API] stopped unexpectedly (exit code ${code}). Check the messages above.`);
    apiProcess = null;
  });

  const ready = await waitForPort(API_PORT, API_HOST);
  if (!ready) console.warn('[API] did not start within 10 seconds. The UI will show "API offline".');
}

function stopApi() {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
}

process.on('SIGINT', () => { stopApi(); process.exit(0); });
process.on('SIGTERM', () => { stopApi(); process.exit(0); });
process.on('exit', stopApi);

/* ---------- Proxy and static files ---------- */
function proxyToApi(req, res) {
  const upstream = http.request(
    {
      host: API_HOST,
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    }
  );

  upstream.on('error', () => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: `Student API is not reachable on port ${API_PORT}.` }));
  });

  req.pipe(upstream);
}

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

/* ---------- Start ---------- */
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url === '/api') return proxyToApi(req, res);
  serveStatic(req, res);
});

(async () => {
  await startApiIfNeeded();
  server.listen(PORT, () => {
    console.log('');
    console.log(`Student Hub is ready: http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop both the frontend and the API.');
  });
})();
