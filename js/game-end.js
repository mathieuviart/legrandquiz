// ─── END GAME ─────────────────────────────────────────────────────────────────
// ─── OPTIMAL SOLVER — Algorithme Hongrois O(n³) ──────────────────────────────
// Remplace le brute-force O(n!) qui explose à partir de n=10 (16! = 20 billions)
// L'algorithme hongrois (Munkres) résout le problème d'affectation optimale en O(n³)
// et fonctionne instantanément pour n=16 comme pour n=8.
var optimalResult = null; // { score, assignment: [{country, catId, catObj, value}] }

function solveOptimal() {
  var n        = gameCountries.length;
  var cats     = gameCategories.map(function(c) { return c.id; });
  var INF      = 1e9;
  var MISSING  = 999; // coût pour une donnée manquante

  // ── Construire la matrice de coûts n×n ──────────────────────────────────────
  // cost[i][j] = coût d'assigner le pays i à la catégorie j
  var cost = [];
  for (var i = 0; i < n; i++) {
    cost[i] = [];
    for (var j = 0; j < n; j++) {
      var v = gameCountries[i][cats[j]];
      cost[i][j] = (v === false || v === null || v === undefined || isNaN(Number(v)))
        ? MISSING
        : Number(v);
    }
  }

  // ── Algorithme Hongrois (Munkres) ───────────────────────────────────────────
  // Variables de potentiel (u pour lignes/pays, v pour colonnes/cats)
  var u = new Array(n + 1).fill(0);
  var v = new Array(n + 1).fill(0);
  // p[j] = indice du pays actuellement affecté à la catégorie j (1-indexé, 0 = libre)
  var p = new Array(n + 1).fill(0);
  // way[j] = via quelle catégorie on est arrivé à j dans le chemin augmentant
  var way = new Array(n + 1).fill(0);

  for (var i = 1; i <= n; i++) {
    // On place le pays i : on cherche le chemin augmentant le moins coûteux
    p[0] = i;
    var j0 = 0;
    var minVal = new Array(n + 1).fill(INF);
    var used   = new Array(n + 1).fill(false);

    do {
      used[j0] = true;
      var i0 = p[j0];
      var delta = INF;
      var j1 = -1;

      for (var j = 1; j <= n; j++) {
        if (!used[j]) {
          // Coût réduit (en tenant compte des potentiels courants)
          var cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minVal[j]) {
            minVal[j] = cur;
            way[j] = j0;
          }
          if (minVal[j] < delta) {
            delta = minVal[j];
            j1 = j;
          }
        }
      }

      // Mise à jour des potentiels
      for (var j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j]    -= delta;
        } else {
          minVal[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    // Augmenter le long du chemin trouvé
    do {
      p[j0] = p[way[j0]];
      j0    = way[j0];
    } while (j0 !== 0);
  }

  // ── Reconstruire l'affectation depuis p[] ───────────────────────────────────
  // p[j] = pays affecté à la catégorie j (indices 1-basés)
  var catOfCountry = new Array(n); // catOfCountry[i] = indice de catégorie pour pays i
  for (var j = 1; j <= n; j++) {
    if (p[j] !== 0) catOfCountry[p[j] - 1] = j - 1;
  }

  var bestScore = 0;
  var assignment = [];
  for (var i = 0; i < n; i++) {
    var ci    = gameCountries[i];
    var cj    = catOfCountry[i];
    var catId = cats[cj];
    var val   = ci[catId];
    var numVal = (val === false || val === null || val === undefined || isNaN(Number(val)))
      ? null : Number(val);
    bestScore += numVal !== null ? numVal : MISSING;
    assignment.push({
      country: ci,
      catId:   catId,
      catObj:  gameCategories[cj],
      value:   numVal
    });
  }

  return { score: bestScore, assignment: assignment };
}

function endGame() {
  if (timerInterval && timerInterval._raf) timerInterval._raf(); timerInterval = null;

  // Apply ended theme
  document.body.classList.remove('hardcore','custom-mode','reverse-mode');
  if (isHardcoreActive()) document.body.classList.add('hardcore-ended');

  document.getElementById('panel-game').classList.add('hidden');

  // Show the dramatic reveal screen first
  showEndReveal(function() {
    // After reveal → show normal end panel
    var revealEl = document.getElementById('end-reveal-screen');
    revealEl.style.opacity = '0';
    setTimeout(function() {
      revealEl.style.display = 'none';
      showEndPanel();
    }, 400);
  });
}

function showEndReveal(onDone) {
  var screen = document.getElementById('end-reveal-screen');
  var container = document.getElementById('reveal-rows-container');
  var scoreEl = document.getElementById('reveal-running-score');
  var labelEl = document.getElementById('reveal-running-label');
  var titleEl = document.getElementById('reveal-screen-title');

  container.innerHTML = '';
  scoreEl.textContent = '0';
  screen.style.display = 'flex';
  screen.style.opacity = '0';
  screen.style.flexDirection = 'column';
  screen.style.alignItems = 'center';
  screen.style.justifyContent = 'center';

  // i18n labels
  titleEl.textContent = isHardcoreActive() ? t('revealTitleHC') : t('revealTitle');
  labelEl.textContent = t('revealScoreLabel');

  // Fix: use inline style for opacity, not class (inline wins over class)
  setTimeout(function() { screen.style.opacity = '1'; }, 30);

  var delay = isHardcoreActive() ? 420 : 300;

  // Pre-compute running totals so each setTimeout has the right snapshot
  var cumulative = [];
  var acc = 0;
  gameLog.forEach(function(entry) {
    var add = (entry.points === false || entry.points === null || isNaN(entry.points)) ? 0 : Number(entry.points);
    acc += add;
    cumulative.push(acc);
  });

  // Build all rows (hidden), then reveal one by one
  gameLog.forEach(function(entry, i) {
    var row = document.createElement('div');
    row.className = 'reveal-row' + (entry.isPenalty ? ' penalty-row' : '');

    var catLabel;
    if (entry.isHint) {
      catLabel = entry.hintLevel === 1 ? t('catLabelHint1') : t('catLabelHint2');
    } else if (entry.isPenalty) {
      catLabel = t('catLabelTimeUp');
    } else {
      catLabel = entry.catObj ? entry.catObj.icon + ' ' + catName(entry.catObj) : '?';
    }

    var ptsVal = entry.isPenalty ? '+' + entry.points : (entry.points === false ? '—' : entry.points);
    var ptsClass = entry.isPenalty ? 'rr-pts penalty' : 'rr-pts';
    var starHtml = '';
    if (!entry.isPenalty && !entry.isHint && entry.starData) {
      if (entry.starData.isGlobalBest) starHtml = '<span class="rr-star">🌟</span>';
      else if (entry.starData.isGameBest) starHtml = '<span class="rr-star">⭐</span>';
    }

    row.innerHTML =
      '<span class="rr-flag">' + entry.flag + '</span>' +
      '<div class="rr-info">' +
        '<div class="rr-name">' + entry.name + '</div>' +
        '<div class="rr-cat">' + catLabel + '</div>' +
      '</div>' +
      '<span class="' + ptsClass + '">' + ptsVal + starHtml + '</span>';

    container.appendChild(row);
    applyEmoji(row);

    setTimeout(function(r, prevScore, newScore) {
      r.classList.add('shown');
      if (newScore !== prevScore) {
        animateCounter(scoreEl, prevScore, newScore, 300, null);
        scoreEl.classList.remove('score-pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('score-pop');
      }
    }.bind(null, row, i > 0 ? cumulative[i-1] : 0, cumulative[i]), (i + 1) * delay);
  });

  var totalDelay = (gameLog.length + 1) * delay + 800;
  setTimeout(onDone, totalDelay);
}

function animateCounter(el, from, to, duration, onStep) {
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var progress = Math.min((ts - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    var current = Math.round(from + (to - from) * eased);
    el.textContent = current;
    if (onStep) onStep(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}

function showEndPanel() {
  document.getElementById('panel-end').classList.remove('hidden');
  // Recompute from gameLog to be bulletproof against any NaN accumulation.
  //
  // WARNING / INVARIANT: entries logged for hint penalties carry a positive
  // `points` value and are added to totalScore during play. we therefore
  // _also_ include them in this recomputation; the computed score must match
  // the running total exactly. if the hint logic ever changes (e.g. storing
  // negative penalties, separating the entries, or removing the recompute
  // entirely) this loop needs to be updated accordingly.  leaving the code as
  // it is protects us from the classic "score doubled after refactor" bug.
  var computedScore = 0;
  gameLog.forEach(function(e) {
    var v = Number(e.points);
    if (!isNaN(v)) computedScore += v;
  });
  if (computedScore !== totalScore) {
    console.warn('score mismatch in showEndPanel', computedScore, totalScore);
  }
  var safeScore = computedScore;
  // overwrite global in case some consumer reads it later (daily, replay, ...)
  totalScore = safeScore;
  document.getElementById('final-score').textContent = safeScore;
  var tl  = t('taglines');
  var idx = safeScore < 100 ? 0 : safeScore < 300 ? 1 : safeScore < 600 ? 2 : safeScore < 1000 ? 3 : 4;
  document.getElementById('end-tagline').textContent = tl[idx];
  document.getElementById('seed-display').innerHTML =
    '<strong>' + t('seedShare') + '</strong><span id="seed-value">' + currentSeed + '</span>';

  // Animate final score
  var scoreEl2 = document.getElementById('final-score');
  scoreEl2.textContent = '0';
  animateCounter(scoreEl2, 0, safeScore, 900, null);

  // Compute optimal
  optimalResult = solveOptimal();
  var diff = safeScore - optimalResult.score;
  document.getElementById('opt-your-score').textContent = safeScore;
  document.getElementById('opt-best-score').textContent = optimalResult.score;
  applyTranslations();

  var diffEl = document.getElementById('opt-diff-row');
  if (diff <= 0) {
    diffEl.innerHTML = '<span style="color:var(--accent);font-weight:700;">' + t('optPerfect') + '</span>';
  } else {
    diffEl.innerHTML = t('optDiff') + ': <span style="color:#ffb34f;font-weight:700;">+' + diff + '</span> pts';
  }
}

function showOptModal() {
  if (!optimalResult) return;
  var modal = document.getElementById('opt-modal');
  document.getElementById('opt-modal-explain').textContent = t('optExplain');

  var rowsEl = document.getElementById('opt-modal-rows');
  rowsEl.innerHTML = '';

  // ── Construire un lookup optimal : country_FR → {catObj, catId, value} ─────
  var optMap = {};
  optimalResult.assignment.forEach(function(a) {
    var key = a.country.country_FR || a.country.country_EN || '';
    optMap[key] = { catObj: a.catObj, catId: a.catId, value: a.value };
  });

  // ── En-tête de colonnes ────────────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'opt-row-header';
  header.innerHTML =
    '<span></span>' +
    '<span></span>' +
    '<span></span>' +
    '<span style="color:#4fc3f7">' + t('optColOptimal') + '</span>' +
    '<span class="opt-header-opt">' + t('optColOptimal').slice(0,3) + '</span>' +
    '<span class="opt-header-mine">' + t('optColMine') + '</span>' +
    '<span class="opt-header-diff">' + t('optColDiff') + '</span>';
  rowsEl.appendChild(header);

  // ── Lignes dans l'ordre de jeu — on ignore les hints (isHint:true) ─────────
  var totalOpt  = 0;
  var totalMine = 0;

  gameLog.forEach(function(entry) {
    // Ignorer les entrées de hints (pénalités internes au tour, pas des tours)
    if (entry.isHint) return;

    var flag  = entry.flag || '🌍';
    var cname = entry.name || '?';
    var cname_short = cname.length > 14 ? cname.slice(0, 13) + '…' : cname;

    // Score du joueur pour ce tour
    var myScore    = entry.isPenalty ? null : (entry.points !== undefined ? entry.points : null);
    var myScoreTxt = entry.isPenalty ? '⚠️' : (myScore !== null ? myScore : '?');

    // Affectation optimale pour ce pays (via country ref ou fallback nom)
    var countryKey = entry.country
      ? (entry.country.country_FR || entry.country.country_EN || cname)
      : cname;
    var optEntry  = optMap[countryKey];
    var optCatObj = optEntry ? optEntry.catObj : null;
    var optVal    = optEntry ? optEntry.value  : null;
    var optTxt    = optVal !== null ? optVal : '?';
    var optCatName  = optCatObj ? catName(optCatObj) : (optEntry ? optEntry.catId : '?');
    var optCatShort = optCatName.length > 14 ? optCatName.slice(0, 13) + '…' : optCatName;

    // Diff
    var diffTxt   = '';
    var diffClass = '';
    if (!entry.isPenalty && myScore !== null && optVal !== null) {
      var diff = myScore - optVal;
      diffTxt   = diff === 0 ? '=' : (diff > 0 ? '+' + diff : '' + diff);
      diffClass = diff === 0 ? 'zero' : (diff > 0 ? 'pos' : 'zero');
    } else if (entry.isPenalty) {
      diffTxt   = '+200';
      diffClass = 'pos';
    }

    // Accumulation totaux
    if (!entry.isPenalty && myScore !== null) totalMine += myScore;
    if (optVal !== null) totalOpt += optVal;

    var row = document.createElement('div');
    row.className = 'opt-row' + (entry.isPenalty ? ' was-penalty' : '');
    row.innerHTML =
      '<span class="opt-row-flag">'    + flag + '</span>' +
      '<span class="opt-row-country" title="' + cname + '">' + cname_short + '</span>' +
      '<span class="opt-row-arrow">→</span>' +
      '<span class="opt-row-cat" title="' + optCatName + '">' + optCatShort + '</span>' +
      '<span class="opt-row-score">'   + optTxt + '</span>' +
      '<span class="opt-row-mine">'    + myScoreTxt + '</span>' +
      '<span class="opt-row-diff '     + diffClass + '">' + diffTxt + '</span>';
    rowsEl.appendChild(row);
  });

  applyEmoji(rowsEl);

  // ── Footer totaux ──────────────────────────────────────────────────────────
  var totalDiff = totalMine - totalOpt;
  document.getElementById('opt-modal-total').textContent = totalOpt;
  document.getElementById('opt-modal-mine').textContent  = totalMine;
  var diffEl = document.getElementById('opt-modal-diff-total');
  diffEl.textContent = totalDiff === 0 ? '0' : (totalDiff > 0 ? '+' + totalDiff : '' + totalDiff);
  diffEl.style.color = totalDiff <= 0 ? 'var(--accent)' : '#ff7c7c';

  modal.style.display = 'block';
  setTimeout(function(){ modal.style.opacity='1'; }, 10);
}

function hideOptModal() {
  document.getElementById('opt-modal').style.display = 'none';
}

// Close modal on background click
document.getElementById('opt-modal').addEventListener('click', function(e) {
  if (e.target === this) hideOptModal();
});

function resetToMenu() {
  // Nettoyer le hash URL
  history.replaceState(null, '', window.location.pathname + window.location.search);
  document.body.classList.remove('hardcore','hardcore-ended','custom-mode','reverse-mode');
  TIME_PER_TURN = 20;
  N_TURNS = 8;
  gameMode = 'normal';

  // Réinitialiser les éléments daily
  isDailyMode = false;
  dailyScore  = null;
  document.getElementById('game-seed-display').style.display = '';
  var optBlock = document.getElementById('opt-block');
  if (optBlock) optBlock.style.display = '';
  var seedBox = document.getElementById('seed-display');
  if (seedBox) seedBox.style.display = '';
  var copyBtnsParent = document.getElementById('btn-copy-seed');
  if (copyBtnsParent && copyBtnsParent.parentElement) copyBtnsParent.parentElement.style.display = '';
  draftMode = 'auto';
  customSubMode = 'normal';
  ['normal','hardcore','reverse'].forEach(function(m) {
    var el = document.getElementById('submode-pill-' + m);
    if (!el) return;
    el.classList.remove('active-normal','active-hardcore','active-reverse');
    if (m === 'normal') el.classList.add('active-normal');
  });
  document.getElementById('panel-custom').classList.add('hidden');
  document.getElementById('panel-end').classList.add('hidden');
  var revealEl = document.getElementById('end-reveal-screen');
  revealEl.style.display = 'none';
  revealEl.classList.remove('visible');
  document.getElementById('panel-setup').classList.remove('hidden');
  document.getElementById('setup-ready').classList.remove('hidden');
  document.getElementById('loader').classList.add('hidden');
  applyTranslations();
}


function replayGame() {
  // Replay with same mode and settings (skip menu)
  document.getElementById('panel-end').classList.add('hidden');
  var revealEl = document.getElementById('end-reveal-screen');
  revealEl.style.display = 'none';
  revealEl.classList.remove('visible');
  isDailyMode = false;
  dailyScore = null;
  startGame(gameMode);
}
function getShareUrl() {
  var base = window.location.href.split('#')[0];
  return base + '#seed=' + encodeURIComponent(currentSeed);
}

function _copyToClipboard(text, btn, successMsg) {
  var orig = btn ? btn.textContent : '';
  var done = function() {
    if (btn) { btn.textContent = successMsg; setTimeout(function() { btn.textContent = orig; }, 2000); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      done();
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    done();
  }
}

function copySeed() {
  var btn = document.getElementById('btn-copy-seed');
  _copyToClipboard(currentSeed || '', btn, t('copied'));
}

function copyUrl() {
  var btn = document.getElementById('btn-copy-url');
  _copyToClipboard(getShareUrl(), btn, t('copiedUrl'));
}


