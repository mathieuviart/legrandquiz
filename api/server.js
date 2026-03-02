const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = [
  ...(process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  'http://localhost:8080',
  'http://localhost:3000',
];

// ── In-memory KV with TTL ────────────────────────────────────────────────────
const store = new Map();

function kvPut(key, value, ttlSeconds) {
  store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

function kvGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { store.delete(key); return null; }
  return entry.value;
}

// Cleanup expired keys every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) { if (now > v.expires) store.delete(k); }
}, 600000);

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function dailySeedFromDate(dateStr) {
  const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) + dateStr.charCodeAt(i);
    hash = hash & 0x7FFFFFFF;
  }
  let result = '';
  let n = hash;
  for (let i = 0; i < 8; i++) {
    result = BASE62[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return result;
}

function hashIP(ip) {
  return crypto.createHash('sha256')
    .update(ip + '_legrandgeoquiz_salt_2025')
    .digest('hex')
    .slice(0, 32);
}

function getIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || 'unknown';
}

function jsonResponse(res, data, status, origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e5) reject(new Error('Too large')); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
  });
}

// ── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] || '';
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    return jsonResponse(res, {}, 200, origin);
  }

  // GET /api/seed
  if (path === '/api/seed' && req.method === 'GET') {
    const date = todayUTC();
    const token = dailySeedFromDate(date);
    const expires = new Date();
    expires.setUTCHours(23, 59, 59, 999);
    const ttl = Math.floor((expires - Date.now()) / 1000) + 3600;
    kvPut(`seed:${date}`, token, Math.max(ttl, 3600));
    return jsonResponse(res, { date, token }, 200, origin);
  }

  // GET /api/played
  // NOTE: the endpoint simply remembers a hashed IP for the day. this is
  // trivially circumventable by using a different IP/proxy or by clearing
  // cookies. no server‑side score validation is performed either; the leaderboard
  // is for fun only. if this service ever becomes competitive it should be
  // hardened (rate‑limit, score sanity checks, CAPTCHAs, etc.).
  if (path === '/api/played' && req.method === 'GET') {
    const date = todayUTC();
    const ipHash = hashIP(getIP(req));
    const played = kvGet(`played:${date}:${ipHash}`);
    return jsonResponse(res, { played: played !== null }, 200, origin);
  }

  // POST /api/score
  if (path === '/api/score' && req.method === 'POST') {
    let body;
    try { body = await parseBody(req); } catch {
      return jsonResponse(res, { error: 'Invalid JSON' }, 400, origin);
    }

    const { pseudo, score, seed_date } = body;
    if (!pseudo || typeof score !== 'number' || !seed_date) {
      return jsonResponse(res, { error: 'Missing fields' }, 400, origin);
    }
    if (pseudo.length > 20 || pseudo.length < 1) {
      return jsonResponse(res, { error: 'Pseudo must be 1-20 characters' }, 400, origin);
    }
    if (score < 0 || score > 99999) {
      return jsonResponse(res, { error: 'Invalid score' }, 400, origin);
    }

    const today = todayUTC();
    if (seed_date !== today) {
      return jsonResponse(res, { error: 'Seed expired' }, 403, origin);
    }

    const ipHash = hashIP(getIP(req));
    const playedKey = `played:${today}:${ipHash}`;
    if (kvGet(playedKey) !== null) {
      return jsonResponse(res, { error: 'Already played today', already_played: true }, 403, origin);
    }

    kvPut(playedKey, '1', 30 * 3600);

    const lbKey = `scores:${today}`;
    const existing = kvGet(lbKey);
    const scores = existing ? JSON.parse(existing) : [];

    scores.push({
      pseudo: pseudo.trim().replace(/[<>]/g, ''),
      score,
      time: new Date().toISOString(),
    });

    scores.sort((a, b) => a.score - b.score);
    const top100 = scores.slice(0, 100);
    kvPut(lbKey, JSON.stringify(top100), 48 * 3600);

    const rank = top100.findIndex(s => s.pseudo === pseudo.trim() && s.score === score) + 1;
    return jsonResponse(res, { success: true, rank, total: top100.length }, 200, origin);
  }

  // GET /api/leaderboard
  if (path === '/api/leaderboard' && req.method === 'GET') {
    const date = url.searchParams.get('date') || todayUTC();
    const data = kvGet(`scores:${date}`);
    const scores = data ? JSON.parse(data) : [];
    return jsonResponse(res, { date, scores: scores.slice(0, 20), total: scores.length }, 200, origin);
  }

  jsonResponse(res, { error: 'Not found' }, 404, origin);
});

server.listen(PORT, () => console.log(`GeoQuiz API listening on :${PORT}`));
