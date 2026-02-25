/**
 * LeGrandGeoQuiz — Cloudflare Worker API
 * Routes :
 *   GET  /api/seed       → seed du jour (Base62, déterministe)
 *   POST /api/score      → soumettre un score { pseudo, score, seed_date }
 *   GET  /api/leaderboard?date=YYYY-MM-DD  → top 20 du jour
 *   GET  /api/played     → est-ce que cette IP a déjà joué aujourd'hui ?
 */

// ── Origines autorisées (ton GitHub Pages + local pour dev) ───────────────────
const ALLOWED_ORIGINS = [
  'https://mathieuviart.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',  // Live Server VS Code
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // "2025-02-25"
}

// Seed déterministe depuis la date — même calcul que côté client
// On utilise un hash simple de la chaîne date → nombre → Base62
function dailySeedFromDate(dateStr) {
  const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  // Hash djb2 de la date
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) + dateStr.charCodeAt(i);
    hash = hash & 0x7FFFFFFF; // garde positif sur 31 bits
  }
  // Convertir en Base62 (6 caractères suffisent comme graine pseudo-aléatoire)
  let result = '';
  let n = hash;
  for (let i = 0; i < 8; i++) {
    result = BASE62[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return result;
}

// Hash de l'IP pour ne pas stocker l'IP brute (RGPD)
async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_legrandgeoquiz_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Récupère l'IP du joueur depuis les headers Cloudflare
function getIP(request) {
  return request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || 'unknown';
}

// Réponse JSON avec les bons headers CORS
function jsonResponse(data, status = 200, origin = '') {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url    = new URL(request.url);
    const path   = url.pathname;

    // Preflight CORS (navigateurs envoient OPTIONS avant POST)
    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 200, origin);
    }

    // ── GET /api/seed ─────────────────────────────────────────────────────────
    if (path === '/api/seed' && request.method === 'GET') {
      const date  = todayUTC();
      const token = dailySeedFromDate(date);

      // On stocke le token dans KV pour que le client puisse vérifier
      // (expiration automatique à minuit UTC + 1h de marge)
      const expires = new Date();
      expires.setUTCHours(23, 59, 59, 999);
      const ttl = Math.floor((expires - Date.now()) / 1000) + 3600;

      await env.QUIZ_DATA.put(`seed:${date}`, token, { expirationTtl: Math.max(ttl, 3600) });

      return jsonResponse({ date, token });
    }

    // ── GET /api/played ───────────────────────────────────────────────────────
    if (path === '/api/played' && request.method === 'GET') {
      const date   = todayUTC();
      const ip     = getIP(request);
      const ipHash = await hashIP(ip);
      const key    = `played:${date}:${ipHash}`;
      const played = await env.QUIZ_DATA.get(key);

      return jsonResponse({ played: played !== null });
    }

    // ── POST /api/score ───────────────────────────────────────────────────────
    if (path === '/api/score' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400, origin);
      }

      const { pseudo, score, seed_date } = body;

      // Validation basique
      if (!pseudo || typeof score !== 'number' || !seed_date) {
        return jsonResponse({ error: 'Missing fields: pseudo, score, seed_date' }, 400, origin);
      }
      if (pseudo.length > 20 || pseudo.length < 1) {
        return jsonResponse({ error: 'Pseudo must be 1–20 characters' }, 400, origin);
      }
      if (score < 0 || score > 99999) {
        return jsonResponse({ error: 'Invalid score' }, 400, origin);
      }

      // Vérifier que la date correspond bien à aujourd'hui
      const today = todayUTC();
      if (seed_date !== today) {
        return jsonResponse({ error: 'Cette seed n\'est plus valide (nouvelle journée)' }, 403, origin);
      }

      // Anti-triche : vérifier si l'IP a déjà joué aujourd'hui
      const ip     = getIP(request);
      const ipHash = await hashIP(ip);
      const playedKey = `played:${today}:${ipHash}`;
      const alreadyPlayed = await env.QUIZ_DATA.get(playedKey);

      if (alreadyPlayed !== null) {
        return jsonResponse({ error: 'Vous avez déjà joué aujourd\'hui !', already_played: true }, 403, origin);
      }

      // Marquer l'IP comme ayant joué (expire dans 30h pour couvrir les fuseaux horaires)
      await env.QUIZ_DATA.put(playedKey, '1', { expirationTtl: 30 * 3600 });

      // Lire le leaderboard existant
      const lbKey = `scores:${today}`;
      const existing = await env.QUIZ_DATA.get(lbKey);
      const scores = existing ? JSON.parse(existing) : [];

      // Ajouter le nouveau score
      scores.push({
        pseudo: pseudo.trim().replace(/[<>]/g, ''), // échapper HTML basique
        score,
        time: new Date().toISOString(),
      });

      // Trier par score croissant (le plus bas gagne), garder top 100
      scores.sort((a, b) => a.score - b.score);
      const top100 = scores.slice(0, 100);

      // Sauvegarder (expire dans 48h)
      await env.QUIZ_DATA.put(lbKey, JSON.stringify(top100), { expirationTtl: 48 * 3600 });

      // Trouver le rang du joueur
      const rank = top100.findIndex(s => s.pseudo === pseudo.trim() && s.score === score) + 1;

      return jsonResponse({ success: true, rank, total: top100.length }, 200, origin);
    }

    // ── GET /api/leaderboard ──────────────────────────────────────────────────
    if (path === '/api/leaderboard' && request.method === 'GET') {
      const date  = url.searchParams.get('date') || todayUTC();
      const lbKey = `scores:${date}`;
      const data  = await env.QUIZ_DATA.get(lbKey);
      const scores = data ? JSON.parse(data) : [];

      // On retourne top 20 uniquement pour l'affichage
      return jsonResponse({
        date,
        scores: scores.slice(0, 20),
        total: scores.length,
      }, 200, origin);
    }

    // ── 404 ───────────────────────────────────────────────────────────────────
    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
