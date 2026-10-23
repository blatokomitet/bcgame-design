import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const clients = new Set();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (pathname === '/') { res.writeHead(302, { Location: '/preview/index.html' }).end(); return; }
  // Expose only the preview assets and the scripts used by the preview, never repository metadata.
  const scripts = ['/bcgame-match-cards-v014.user.js', '/bcgame.user.js', '/bcgame-calm-dark.user.js'];
  if (!pathname.startsWith('/preview/') && !scripts.includes(pathname)) { res.writeHead(404).end(); return; }
  if (pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(404).end(); return; }
  const path = resolve(root, '.' + pathname);
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
  try {
    if (!(await stat(path)).isFile()) throw new Error('not a file');
    let data = await readFile(path);
    if (extname(path) === '.html') data = Buffer.from(data.toString().replace('</head>', '<meta name="bc-dev-server" content="1"></head>'));
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end('Not found'); }
});
let queued;
const watcher = watch(root, { recursive: true }, (_, filename) => {
  if (!filename || filename.startsWith('.') || filename.startsWith('node_modules')) return;
  if (!/\.(css|js|html)$/.test(filename)) return;
  clearTimeout(queued); queued = setTimeout(() => {
    for (const client of clients) client.write('data: reload\n\n');
  }, 150);
});
server.listen(port, '0.0.0.0', () => console.log(`Preview: http://localhost:${port} (auto-reload enabled)`));
function stop() { watcher.close(); clearTimeout(queued); for (const client of clients) client.end(); server.close(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
