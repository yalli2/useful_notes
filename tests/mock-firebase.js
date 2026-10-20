/* 테스트용 가짜 Firebase Realtime Database (REST + SSE 일부 구현). 사용: node tests/mock-firebase.js [port] */
const http = require('http');
const port = +process.argv[2] || 9099;
let db = {};
const clients = new Set();
const seg = (p) => p.split('/').filter(Boolean).map(decodeURIComponent);
const get = (p) => { let o = db; for (const s of seg(p)) { if (o == null || typeof o !== 'object') return null; o = o[s]; } return o === undefined ? null : o; };
function set(p, v) {
  const s = seg(p); if (!s.length) { db = v || {}; return; }
  let o = db; for (let i = 0; i < s.length - 1; i++) { if (o[s[i]] == null || typeof o[s[i]] !== 'object') { if (v == null) return; o[s[i]] = {}; } o = o[s[i]]; }
  if (v == null) delete o[s[s.length - 1]]; else o[s[s.length - 1]] = v;
}
const send = (c, ev, data) => c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
function notify(wp, v) {
  const w = '/' + seg(wp).join('/');
  clients.forEach((c) => {
    const b = '/' + seg(c.path).join('/');
    if (w === b || w.startsWith(b === '/' ? '/' : b + '/')) send(c, 'put', { path: w === b ? '/' : w.slice(b === '/' ? 0 : b.length), data: v });
    else if (b.startsWith(w + '/') || w === '/') send(c, 'put', { path: '/', data: get(c.path) });
  });
}
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const path = decodeURIComponent(req.url.split('?')[0]).replace(/\.json$/, '');
  if (req.url === '/__dump') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify(db)); }
  if (req.method === 'GET' && (req.headers.accept || '').includes('text/event-stream')) {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const c = { res, path }; clients.add(c); send(c, 'put', { path: '/', data: get(path) }); req.on('close', () => clients.delete(c)); return;
  }
  if (req.method === 'GET') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify(get(path))); }
  let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => {
    if (req.method === 'DELETE') { set(path, null); notify(path, null); }
    else if (req.method === 'PUT') { const v = JSON.parse(body); set(path, v); notify(path, v); }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.end('null');
  });
}).listen(port, () => console.log('mock firebase on ' + port));
