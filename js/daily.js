// ─── DAILY MODE ───────────────────────────────────────────────────────────────
var DAILY_API = (new URLSearchParams(window.location.search).get('api')) || window.GEOQUIZ_API || 'https://legrandgeoquiz-api.mathieu-viart73.workers.dev';
var dailyDate   = '';   // "YYYY-MM-DD" du jour courant
var dailyToken  = '';   // seed token reçu de l'API
var dailyScore  = null; // score de la partie daily en cours
var isDailyMode = false;

// ── Initialisation : vérifie si déjà joué + affiche la date ──────────────────
async function initDailyBlock() {
  // Date locale en YYYY-MM-DD
  var now = new Date();
  dailyDate = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  // Afficher la date sur le badge
  var badge = document.getElementById('daily-date-badge');
  if (badge) badge.textContent = dailyDate;

  // Vérifier si déjà joué aujourd'hui via l'API
  try {
    var res = await fetch(DAILY_API + '/api/played', { method: 'GET' });
    if (res.ok) {
      var data = await res.json();
      if (data.played) {
        _setDailyPlayed();
      }
    }
  } catch(e) {
    // Pas de connexion ? On laisse jouer, le serveur rejettera si besoin
    console.warn('Daily check failed (offline?)', e);
  }
}

function _setDailyPlayed() {
  var btn = document.getElementById('btn-daily');
  var msg = document.getElementById('daily-played-msg');
  if (btn) { btn.disabled = true; }
  if (msg) { msg.classList.remove('hidden'); }
}

// ── Lancer la partie Daily ────────────────────────────────────────────────────
async function startDailyGame() {
  var btn = document.getElementById('btn-daily');
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

  try {
    // Récupérer le token du jour
    var res = await fetch(DAILY_API + '/api/seed');
    if (!res.ok) throw new Error('API error ' + res.status);
    var data = await res.json();
    dailyDate  = data.date;
    dailyToken = data.token;
  } catch(e) {
    alert(t('dailyErrNetwork'));
    if (btn) { btn.disabled = false; btn.textContent = '🏆 Daily'; }
    return;
  }

  // Générer une seed déterministe depuis le token
  // On utilise le token comme graine pour mélanger les pays/catégories
  var seed = _generateDailySeed(dailyToken);
  if (!seed) {
    alert(t('dailyErrNetwork'));
    if (btn) { btn.disabled = false; }
    return;
  }

  isDailyMode = true;
  dailyScore  = null;

  // Lancer en mode custom / normal / 20s
  gameMode      = 'custom';
  customSubMode = 'normal';
  N_TURNS       = 8;
  TIME_PER_TURN = 20;

  // Masquer le score et la seed pendant la partie (anti-triche)
  document.getElementById('game-seed-display').style.display = 'none';

  startGame('custom', seed);
}

// Génère une seed déterministe depuis le token du jour
function _generateDailySeed(token) {
  // Utilise le token comme générateur pseudo-aléatoire déterministe
  // On dérive un état RNG depuis le token, puis on tire pays et catégories
  var rng = _makeRng(token);

  // Pool complet
  var countryPool = [];
  for (var i = 0; i < countriesDB.length; i++) countryPool.push(i);
  var catPool = [];
  for (var i = 0; i < ALL_CATEGORIES.length; i++) catPool.push(i);

  // Fisher-Yates shuffle déterministe
  _shuffle(countryPool, rng);
  _shuffle(catPool, rng);

  // Prendre les 8 premiers pays et catégories compatibles
  var n = 8;
  var chosenCats = catPool.slice(0, n);
  var catIds = chosenCats.map(function(i) { return ALL_CATEGORIES[i].id; });

  // Filtrer les pays qui ont toutes les catégories
  var eligible = countryPool.filter(function(ci) {
    return catIds.every(function(id) {
      var v = countriesDB[ci][id];
      return v !== false && v !== null && v !== undefined;
    });
  });

  if (eligible.length < n) {
    // Fallback : on prend les meilleurs pays même si incomplets
    eligible = countryPool;
  }

  var chosenCountries = eligible.slice(0, n);

  // Re-mélanger l'ordre pour que les pays n'arrivent pas triés par index
  _shuffle(chosenCountries, rng);
  _shuffle(chosenCats, rng);

  return encodeSeed(chosenCountries, chosenCats, 'normal', 20);
}

// LCG simple — suffisant pour une seed déterministe non-cryptographique
function _makeRng(token) {
  // Hash du token → seed numérique
  var seed = 0;
  for (var i = 0; i < token.length; i++) {
    seed = (seed * 31 + token.charCodeAt(i)) & 0x7FFFFFFF;
  }
  seed = seed || 12345;
  return function() {
    seed = (seed * 1664525 + 1013904223) & 0x7FFFFFFF;
    return seed / 0x7FFFFFFF;
  };
}

function _shuffle(arr, rng) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ── Fin de partie Daily : intercepte showEndPanel ─────────────────────────────
var _origShowEndPanel = null;

function skipDailySubmit() {
  var overlay = document.getElementById('daily-submit-overlay');
  if (overlay) overlay.style.display = 'none';
  _setDailyPlayed();
  // leave isDailyMode true until after the leaderboard opens, just in case
  setTimeout(function() {
    isDailyMode = false;
    openLeaderboard();
  }, 200);
}

// ── Modal submit ──────────────────────────────────────────────────────────────
function openSubmitModal() {
  var overlay = document.getElementById('daily-submit-overlay');
  var display = document.getElementById('daily-score-display');
  var input   = document.getElementById('daily-pseudo-input');
  var msg     = document.getElementById('daily-submit-msg');
  if (display) display.textContent = dailyScore !== null ? dailyScore + ' pts' : '—';
  if (msg)     msg.textContent = '';
  if (input)   input.value = '';
  if (overlay) { overlay.style.display = 'flex'; setTimeout(function(){ if(input) input.focus(); }, 100); }
  applyTranslations();
}

function skipDailySubmit() {
  var overlay = document.getElementById('daily-submit-overlay');
  if (overlay) overlay.style.display = 'none';
  isDailyMode = false;
  _setDailyPlayed();
  // Ouvrir le leaderboard
  setTimeout(openLeaderboard, 200);
}

async function submitDailyScore() {
  var pseudo = (document.getElementById('daily-pseudo-input').value || '').trim();
  var msg    = document.getElementById('daily-submit-msg');

  if (!pseudo || pseudo.length < 1 || pseudo.length > 20) {
    msg.textContent = t('dailyErrPseudo');
    msg.className   = 'daily-submit-msg err';
    return;
  }

  msg.textContent = '⏳';
  msg.className   = 'daily-submit-msg';

  try {
    var res = await fetch(DAILY_API + '/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo: pseudo, score: dailyScore, seed_date: dailyDate })
    });
    var data = await res.json();

    if (!res.ok) {
      if (data.already_played) {
        msg.textContent = t('dailyErrPlayed');
      } else {
        msg.textContent = data.error || t('dailyErrNetwork');
      }
      msg.className = 'daily-submit-msg err';
      return;
    }

    // Succès
    var rankStr = t('dailyRank') + ' ' + data.rank + ' ' + t('dailyOf') + ' ' + data.total;
    msg.textContent = '✓ ' + rankStr;
    msg.className   = 'daily-submit-msg ok';
    _setDailyPlayed();
    isDailyMode = false;

    // Fermer et ouvrir le leaderboard après 1.5s
    setTimeout(function() {
      document.getElementById('daily-submit-overlay').style.display = 'none';
      openLeaderboard();
    }, 1500);

  } catch(e) {
    msg.textContent = t('dailyErrNetwork');
    msg.className   = 'daily-submit-msg err';
  }
}

// ── Leaderboard modal ─────────────────────────────────────────────────────────
async function openLeaderboard() {
  var overlay = document.getElementById('daily-lb-overlay');
  var dateEl  = document.getElementById('daily-lb-date');
  var rowsEl  = document.getElementById('daily-lb-rows');
  var totalEl = document.getElementById('daily-lb-total');

  if (!overlay) return;
  overlay.classList.add('open');
  if (dateEl) dateEl.textContent = dailyDate || new Date().toISOString().slice(0,10);
  if (rowsEl) rowsEl.innerHTML   = '<div class="lb-empty">⏳</div>';
  if (totalEl) totalEl.textContent = '';
  applyTranslations();

  try {
    var date = dailyDate || new Date().toISOString().slice(0,10);
    var res  = await fetch(DAILY_API + '/api/leaderboard?date=' + date);
    var data = await res.json();
    _renderLeaderboard(data.scores || [], data.total || 0);
  } catch(e) {
    if (rowsEl) rowsEl.innerHTML = '<div class="lb-empty">' + t('dailyErrNetwork') + '</div>';
  }
}

function _renderLeaderboard(scores, total) {
  var rowsEl  = document.getElementById('daily-lb-rows');
  var totalEl = document.getElementById('daily-lb-total');

  if (!scores || scores.length === 0) {
    rowsEl.innerHTML = '<div class="lb-empty">' + t('dailyLbEmpty') + '</div>';
    if (totalEl) totalEl.textContent = '';
    return;
  }

  var medals = ['🥇', '🥈', '🥉'];
  var rankClasses = ['gold', 'silver', 'bronze'];

  var html = '';
  scores.forEach(function(s, i) {
    var rank    = i + 1;
    var rankStr = rank <= 3 ? medals[rank - 1] : rank;
    var cls     = rank <= 3 ? rankClasses[rank - 1] : '';
    html += '<div class="lb-row">' +
      '<span class="lb-rank ' + cls + '">' + rankStr + '</span>' +
      '<span class="lb-pseudo">' + _escHtml(s.pseudo) + '</span>' +
      '<span class="lb-score">' + s.score + '</span>' +
      '</div>';
  });

  rowsEl.innerHTML = html;
  if (totalEl && total > scores.length) {
    totalEl.textContent = 'Top ' + scores.length + ' / ' + total + ' ' + (total > 1 ? t('lbTotalPlayersP') : t('lbTotalPlayers'));
  }
}

function closeLbModal() {
  var overlay = document.getElementById('daily-lb-overlay');
  if (overlay) overlay.classList.remove('open');
}

function _escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

