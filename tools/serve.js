// Tiny static server for local use: node tools/serve.js  →  http://localhost:5173
// ES modules don't load from file://, so the app needs to be served.
// Set QB_TEST_FILES to a folder to expose it read-only at /__test/ for browser tests.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDir = process.env.QB_TEST_FILES ? path.resolve(process.env.QB_TEST_FILES) : null;
const port = +process.env.PORT || 5173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.zip': 'application/zip' };

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let base = root, rel = url;
  if (testDir && url.startsWith('/__test/')) { base = testDir; rel = url.slice('/__test'.length); }
  const file = path.join(base, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(base) || /node_modules|[\\/]\.|[\\/]out[\\/]/.test(path.relative(base, file))) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log(`Quillbound running at http://localhost:${port}${testDir ? `  (test files: ${testDir})` : ''}`));
