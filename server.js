// Meetly signaling server: serves the client and relays WebRTC signaling + chat.
// Media (audio/video) flows peer-to-peer; this server never touches it.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(PUBLIC, path.normalize(p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomId -> Map(peerId -> ws)

const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const broadcast = (room, msg, exceptId) => {
  for (const [id, peer] of rooms.get(room) || []) if (id !== exceptId) send(peer, msg);
};

wss.on('connection', (ws) => {
  ws.id = crypto.randomBytes(4).toString('hex');

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'join') {
      const room = String(m.room || '').slice(0, 64);
      if (!room) return;
      ws.room = room;
      ws.name = String(m.name || 'Guest').slice(0, 40);
      if (!rooms.has(room)) rooms.set(room, new Map());
      const members = rooms.get(room);
      const peers = [...members.values()].map((p) => ({ id: p.id, name: p.name, state: p.state }));
      members.set(ws.id, ws);
      send(ws, { type: 'joined', id: ws.id, peers });
      broadcast(room, { type: 'peer-joined', id: ws.id, name: ws.name }, ws.id);
      return;
    }

    if (!ws.room) return;

    if (m.type === 'signal') {
      const target = rooms.get(ws.room)?.get(m.to);
      if (target) send(target, { type: 'signal', from: ws.id, data: m.data });
    } else if (m.type === 'chat') {
      const text = String(m.text || '').slice(0, 2000);
      if (text.trim()) broadcast(ws.room, { type: 'chat', from: ws.id, name: ws.name, text, ts: Date.now() });
    } else if (m.type === 'state') {
      ws.state = m.state;
      broadcast(ws.room, { type: 'state', from: ws.id, state: m.state }, ws.id);
    }
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const members = rooms.get(ws.room);
    if (!members) return;
    members.delete(ws.id);
    broadcast(ws.room, { type: 'peer-left', id: ws.id });
    if (members.size === 0) rooms.delete(ws.room);
  });
});

server.listen(PORT, () => console.log(`Meetly running at http://localhost:${PORT}`));
