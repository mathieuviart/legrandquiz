// ─── STATE ────────────────────────────────────────────────────────────────────
var countriesDB    = [];
var gameCountries  = [];
var gameCategories = [];
var currentStep    = 0;
var totalScore     = 0;
var timerInterval  = null;
var timeLeft       = 20;
var usedCategories = {};
var gameLog        = []; // [{flag, name, catObj, points, isPenalty}]
var currentSeed    = '';
var TIME_PER_TURN  = 20;
var isRevealing    = false;
var gameMode       = 'normal'; // 'normal' | 'hardcore' | 'custom'
var N_TURNS        = 8;
// hideScore : true en mode hardcore (le score est masque pendant la partie)
function hideScore() { return gameMode === 'hardcore' || (gameMode === 'custom' && customSubMode === 'hardcore'); }
function isHardcoreActive() { return gameMode === 'hardcore' || (gameMode === 'custom' && customSubMode === 'hardcore'); }
var CUSTOM_TIME    = 20;
var draftMode      = 'auto';  // 'auto'|'cats'|'countries'
var reverseAssignments = {}; // countryIdx -> catId, for reverse mode
var draftCounter   = 0;       // increments each game, used for alternating
var lastDraftUsed  = '';      // 'cats' or 'countries' — set during generation

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initApp() {
  try {
    var res = await fetch('./country.json');
    if (!res.ok) throw new Error('not found');
    var data = await res.json();
    countriesDB = data.Main || data.countries || data;
  } catch(e) {
    console.warn('country.json not found — using fallback');
    countriesDB = getFallbackData();
  }
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('setup-ready').classList.remove('hidden');
  applyTranslations();

  // ── Patch showEndPanel pour le mode Daily ──────────────────────────────────
  _origShowEndPanel = showEndPanel;
  showEndPanel = _dailyShowEndPanel;

  // ── Initialiser le bloc Daily (vérif already-played, date badge) ───────────
  initDailyBlock();

  // ── Lecture du hash URL : #seed=XXXX ──────────────────────────────────────
  var hash = window.location.hash;
  var match = hash.match(/[#&]seed=([^&]+)/);
  if (match) {
    var seedFromUrl = decodeURIComponent(match[1]);
    setTimeout(function() {
      startGame('custom', seedFromUrl);
    }, 100);
  }
}


function showCountdown(onDone) {
  var overlay = document.getElementById('countdown-overlay');
  var numEl   = document.getElementById('countdown-num');
  var subEl   = document.getElementById('countdown-sub');
  var counts  = ['3','2','1','GO'];
  overlay.classList.add('active');
  subEl.textContent = '';
  var i = 0;
  function showStep() {
    numEl.className = 'countdown-num';
    void numEl.offsetWidth;
    numEl.textContent = counts[i];
    // On GO: show draft emoji as subtitle
    if (i === counts.length - 1) {
      subEl.textContent = lastDraftUsed === 'countries' ? '🌍' : '📊';
    } else {
      subEl.textContent = '';
    }
    i++;
    if (i < counts.length) {
      setTimeout(function() {
        numEl.classList.add('fadeout');
        setTimeout(showStep, 300);
      }, 700);
    } else {
      setTimeout(function() {
        numEl.classList.add('fadeout');
        setTimeout(function() {
          overlay.classList.remove('active');
          subEl.textContent = '';
          onDone();
        }, 280);
      }, 550);
    }
  }
  showStep();
}

// ─── GAME START ───────────────────────────────────────────────────────────────
function startGame(modeOrSeed, seedOverride) {
  if (modeOrSeed === 'normal' || modeOrSeed === 'hardcore' || modeOrSeed === 'custom' || modeOrSeed === 'reverse') {
    gameMode = modeOrSeed;
  } else if (typeof modeOrSeed === 'string' && modeOrSeed) {
    seedOverride = modeOrSeed;
  }

  // Apply N_TURNS and time per mode
  document.body.classList.remove('hardcore', 'custom-mode', 'reverse-mode');
  if (gameMode === 'custom') {
    if (!seedOverride) {
      N_TURNS = parseInt(document.getElementById('custom-n-slider').value, 10) || 8;
    }
    TIME_PER_TURN = customTimeSelected;
    document.body.classList.add('custom-mode');
    document.getElementById('panel-custom').classList.add('hidden');
    document.getElementById('panel-setup').classList.add('hidden');
    // Apply sub-mode
    if (customSubMode === 'hardcore') {
      document.body.classList.add('hardcore');
    } else if (customSubMode === 'reverse') {
      document.body.classList.add('reverse-mode');
      reverseAssignments = {};
    }
  } else if (gameMode === 'reverse') {
    N_TURNS = 8;
    TIME_PER_TURN = 20;
    document.body.classList.add('reverse-mode');
    document.getElementById('panel-setup').classList.add('hidden');
    reverseAssignments = {};
  } else {
    N_TURNS = 8;
    TIME_PER_TURN = (gameMode === 'hardcore') ? 10 : 20;
    if (gameMode === 'hardcore') document.body.classList.add('hardcore');
    document.getElementById('panel-setup').classList.add('hidden');
  }

  var seed = seedOverride || generateSeed();
  if (!applyGameFromSeed(seed)) return;
  // Sync N_TURNS to actual game size (important when loading a seed)
  N_TURNS = gameCountries.length;
  currentSeed    = seed;
  currentStep    = 0;
  totalScore     = 0;
  usedCategories = {};
  gameLog        = [];
  isRevealing    = false;
  if (typeof resetHints === 'function') resetHints();

  // Show countdown, then launch
  showCountdown(function() {
    document.getElementById('panel-game').classList.remove('hidden');
    document.getElementById('game-seed-display').textContent = currentSeed;
    // Mettre à jour le hash URL pour permettre le partage
    history.replaceState(null, '', '#seed=' + encodeURIComponent(currentSeed));
    renderCategoryButtons();
    showTurn();
  });
}

function startWithSeedInput() {
  var raw = document.getElementById('seed-input').value.trim();
  if (!raw) { alert(t('enterSeed')); return; }
  // Support ancien format legacy (12-45_0-5) et nouveau format Base62
  var seed = raw;
  // Si l'utilisateur a collé du texte avec une seed entourée d'espaces, on nettoie
  seed = seed.replace(/\s+/g, '');
  startGame('custom', seed);
}

// ─── CATEGORY BUTTONS ─────────────────────────────────────────────────────────
function makeCatBtnHTML(cat) {
  return '<div class="cat-btn-top">'
       + '<span class="cat-icon">' + cat.icon + '</span>'
       + '<span class="cat-info-btn" data-catid="' + cat.id + '">i</span>'
       + '</div>'
       + '<span class="cat-label-text">' + catName(cat) + '</span>';
}

function renderCategoryButtons() {
  var grid = document.getElementById('cats-grid');
  grid.innerHTML = '';
  gameCategories.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.id = 'cat-' + cat.id;
    btn.innerHTML = makeCatBtnHTML(cat);
    btn.addEventListener('click', function(e) {
      if (e.target.closest('.cat-info-btn')) return;
      handleChoice(cat.id);
    });
    grid.appendChild(btn);
  });
  attachInfoListeners();
}


// ─── RERENDER CURRENT TURN ON LANG CHANGE ─────────────────────────────────────
// Appelé par setLang() pour mettre à jour immédiatement le tour en cours
// sans attendre le prochain tour.
function rerenderCurrentTurn() {
  var inGame = (document.getElementById('panel-game') &&
                !document.getElementById('panel-game').classList.contains('hidden'));
  if (!inGame) return;
  if (currentStep >= gameCountries.length && currentStep >= gameCategories.length) return;

  var isReverse = (gameMode === 'reverse' ||
                   (gameMode === 'custom' && customSubMode === 'reverse'));

  if (isReverse) {
    // ── Reverse : mettre à jour la catégorie affichée ─────────────────────
    if (currentStep < gameCategories.length) {
      var cat = gameCategories[currentStep];
      document.getElementById('reverse-cat-name').textContent    = catName(cat);
      document.getElementById('reverse-cat-tooltip').textContent = catDesc(cat);
      document.getElementById('turn-label').textContent =
        t('reverseTurn') + ' ' + (currentStep + 1) + ' ' + t('of') + ' ' + gameCategories.length;
    }
  } else {
    // ── Normal / Hardcore / Custom ─────────────────────────────────────────
    if (currentStep < gameCountries.length) {
      var c = gameCountries[currentStep];
      document.getElementById('country-name').textContent = getCountryName(c);
      document.getElementById('turn-label').textContent =
        t('turn') + ' ' + (currentStep + 1) + ' ' + t('of') + ' ' + gameCountries.length;

      // Hint buttons : état selon s'ils ont été révélés ou non
      var btn1 = document.getElementById('hint-btn-1');
      var btn2 = document.getElementById('hint-btn-2');
      if (btn1 && !btn1.classList.contains('revealed')) {
        btn1.innerHTML = '\uD83D\uDCA1 ' + t('hint1btn');
      }
      if (btn2 && !btn2.classList.contains('revealed')) {
        btn2.innerHTML = '\uD83D\uDD0D ' + t('hint2btn');
      }

      // Labels des hints déjà révélés (titre de section)
      if (hintState.hint1Revealed) {
        var lbl1 = document.getElementById('hint-label-1');
        if (lbl1) lbl1.innerHTML = t('hintLabel1') + ' <span class="cost-badge cost-badge-1">-25 pts</span>';
      }
      if (hintState.hint2Revealed) {
        var lbl2 = document.getElementById('hint-label-2');
        if (lbl2) lbl2.innerHTML = t('hintLabel2') + ' <span class="cost-badge cost-badge-2">-50 pts</span>';
      }
    }
  }
}

function rerenderCategoryButtonNames() {
  gameCategories.forEach(function(cat) {
    var btn = document.getElementById('cat-' + cat.id);
    if (!btn || btn.disabled) return;
    var el = btn.querySelector('.cat-label-text');
    if (el) el.textContent = catName(cat);
    var infoBtn = btn.querySelector('.cat-info-btn');
    if (infoBtn) {
      infoBtn.replaceWith(infoBtn.cloneNode(true));
    }
  });
  attachInfoListeners();
}

function attachInfoListeners() {
  document.querySelectorAll('.cat-info-btn').forEach(function(el) {
    var clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('mouseenter', function() { showTooltip(clone.dataset.catid, clone); });
    clone.addEventListener('mouseleave', hideTooltip);
    clone.addEventListener('click', function(e) {
      e.stopPropagation();
      var tip = document.getElementById('cat-tooltip');
      if (tip.classList.contains('visible')) hideTooltip();
      else showTooltip(clone.dataset.catid, clone);
    });
  });
}

// ─── TURN DISPLAY ─────────────────────────────────────────────────────────────
function showTurn() {
  if (currentStep >= gameCountries.length) { endGame(); return; }
  if (gameMode === 'reverse' || (gameMode === 'custom' && customSubMode === 'reverse')) { showTurnReverse(); return; }

  var c    = gameCountries[currentStep];
  var name = getCountryName(c);
  var flag = c.flag || c.emoji || '🌍';

  document.getElementById('country-flag').textContent = flag;
  applyEmoji(document.getElementById('country-flag'));
  document.getElementById('country-name').textContent = name;
  document.getElementById('country-sub').textContent  = '';

  var btn1 = document.getElementById('hint-btn-1');
  var desc1 = getCountryDesc(c);
  btn1.style.display = desc1 ? 'inline-flex' : 'none';
  document.getElementById('hint-btn-2').style.display = 'none';
  document.getElementById('turn-label').textContent   = t('turn') + ' ' + (currentStep+1) + ' ' + t('of') + ' ' + gameCountries.length;
  document.getElementById('total-score').textContent  = totalScore;

  gameCategories.forEach(function(cat) {
    var btn = document.getElementById('cat-' + cat.id);
    if (!btn) return;
    if (usedCategories[cat.id]) {
      btn.disabled = true;
    } else {
      btn.disabled = false;
      btn.innerHTML = makeCatBtnHTML(cat);
      btn.style.borderColor = '';
      btn.style.color = '';
      // re-bind click
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      (function(catId) {
        newBtn.addEventListener('click', function(e) {
          if (e.target.closest('.cat-info-btn')) return;
          handleChoice(catId);
        });
      })(cat.id);
    }
  });

  applyEmoji(document.getElementById('cats-grid'));
  resetHints();
  attachInfoListeners();
  clearFeedback();
  startTimer();
}


// ─── REVERSE MODE TURN ────────────────────────────────────────────────────────
function showTurnReverse() {
  // In reverse: currentStep = which category is active
  // All countries shown as buttons; user picks which country gets this category
  var cat = gameCategories[currentStep];
  document.getElementById('turn-label').textContent = t('reverseTurn') + ' ' + (currentStep+1) + ' ' + t('of') + ' ' + gameCategories.length;
  document.getElementById('total-score').textContent = totalScore;

  // Show the active category
  document.getElementById('reverse-cat-icon').textContent = cat.icon;
  applyEmoji(document.getElementById('reverse-cat-icon'));
  document.getElementById('reverse-cat-name').textContent = catName(cat);
  document.getElementById('reverse-cat-tooltip').textContent = catDesc(cat);
  document.getElementById('reverse-cat-tooltip').classList.remove('open');

  renderCountryButtons();
  clearFeedback();
  startTimer();
}

function toggleReverseCatInfo() {
  var el = document.getElementById('reverse-cat-tooltip');
  el.classList.toggle('open');
  // refresh text in case lang changed
  var cat = gameCategories[currentStep];
  if (cat) el.textContent = catDesc(cat);
}

function renderCountryButtons() {
  var grid = document.getElementById('countries-grid');
  grid.innerHTML = '';
  gameCountries.forEach(function(country, idx) {
    var btn = document.createElement('button');
    btn.className = 'country-btn';
    btn.id = 'country-btn-' + idx;
    var flag = country.flag || country.emoji || '🌍';
    var name = getCountryName(country);
    var assignedCatId = reverseAssignments[idx];
    var catBadge = '';
    if (assignedCatId) {
      var assignedCat = gameCategories.find(function(c) { return c.id === assignedCatId; });
      catBadge = assignedCat ? (assignedCat.icon + ' ' + catName(assignedCat)) : '';
      btn.classList.add('assigned');
      btn.disabled = true;
    }
    btn.innerHTML =
      '<span class="cb-flag">' + flag + '</span>' +
      '<span class="cb-info">' +
        '<span class="cb-name">' + name + '</span>' +
        (catBadge ? '<span class="cb-cat-badge">' + catBadge + '</span>' : '') +
      '</span>';
    applyEmoji(btn);
    if (!assignedCatId) {
      (function(i) {
        btn.addEventListener('click', function() { handleCountryChoice(i); });
      })(idx);
    }
    grid.appendChild(btn);
  });
}

function handleCountryChoice(countryIdx) {
  if (isRevealing) return;
  if (timerInterval && timerInterval._raf) timerInterval._raf(); timerInterval = null;
  var btn = document.getElementById('country-btn-' + countryIdx);
  if (!btn || btn.disabled) return;

  var cat     = gameCategories[currentStep];
  var country = gameCountries[countryIdx];
  var rawVal  = country[cat.id];
  var points  = (rawVal === false || rawVal === null || rawVal === undefined) ? false : Number(rawVal);
  var pts     = (points === false || isNaN(points)) ? 0 : Number(points);
  var flag    = country.flag || country.emoji || '🌍';
  var cName   = getCountryName(country);

  reverseAssignments[countryIdx] = cat.id;
  isRevealing = true;

  // Mark chosen button
  document.querySelectorAll('.country-btn').forEach(function(b) { b.disabled = true; });
  btn.style.borderColor = '#f5c842';
  btn.style.boxShadow = '0 0 14px rgba(245,200,66,0.35)';

  var rsd = computeStarDataReverse(cat, countryIdx);
  gameLog.push({flag:flag, name:cName, catObj:cat, points:pts, isPenalty:false, starData:rsd, country:gameCountries[countryIdx]});

  var bestHtmlR = buildBestCountriesPanel(cat, countryIdx);
  showReveal(flag, cName, cat, points, function() {
    isRevealing = false;
    if (pts > 0) {
      totalScore += pts;
      document.getElementById('total-score').textContent = totalScore;
    }
    currentStep++;
    showTurn();
  }, rsd, bestHtmlR);
}

function autoPick_reverse() {
  // Timeout in reverse: penalty, assign to first available country
  var firstFree = -1;
  for (var i = 0; i < gameCountries.length; i++) {
    if (!reverseAssignments[i]) { firstFree = i; break; }
  }
  if (firstFree === -1) { currentStep++; showTurn(); return; }

  var cat     = gameCategories[currentStep];
  var country = gameCountries[firstFree];
  var flag    = country.flag || country.emoji || '🌍';
  var cName   = getCountryName(country);
  var PENALTY = 200;
  totalScore += PENALTY;
  reverseAssignments[firstFree] = cat.id;
  gameLog.push({flag:flag, name:cName, catObj:cat, points:PENALTY, isPenalty:true, country:country});

  document.getElementById('total-score').textContent = totalScore;
  var overlay = document.createElement('div');
  overlay.id = 'reveal-overlay';
  overlay.innerHTML =
    '<div class="reveal-card" style="border-color:#ff9d00;">' +
    '<div class="reveal-cat-label" style="color:#ff9d00;">' + t('timeUp') + '</div>' +
    '<div class="reveal-cat-name" style="color:#f5c842;">' + cat.icon + ' ' + catName(cat) + '</div>' +
    '<div class="reveal-country"><span class="reveal-flag">' + flag + '</span>' +
    '<span class="reveal-country-name">' + cName + '</span></div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:4em;font-weight:700;color:#ff9d00;margin:16px 0;animation:penaltyPop 0.4s cubic-bezier(0.34,1.56,0.64,1);">+' + PENALTY + '</div>' +
    '<div class="reveal-points-label" style="color:#ff9d00;">' + t('penalty') + '</div>' +
    '<button class="reveal-skip" id="reveal-skip-btn" style="border-color:#f5c842;color:#f5c842;">' + t('skip') + '</button>' +
    '</div>';
  var s = document.createElement('style');
  s.textContent = '@keyframes penaltyPop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}';
  overlay.appendChild(s);
  document.body.appendChild(overlay);
  applyEmoji(overlay);
  var closed = false;
  function close() {
    if (closed) return; closed = true;
    overlay.style.transition = 'opacity 0.3s'; overlay.style.opacity = '0';
    setTimeout(function() { isRevealing = false; overlay.remove(); currentStep++; showTurn(); }, 300);
  }
  document.getElementById('reveal-skip-btn').onclick = close;
  setTimeout(close, 2500);
}

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (timerInterval && timerInterval._raf) timerInterval._raf(); timerInterval = null;

  // Infinite time: show ∞, no countdown, no autopick
  if (TIME_PER_TURN === 0) {
    var numEl2 = document.getElementById('timer-num');
    var fillEl2 = document.getElementById('progress-fill');
    numEl2.textContent = '∞';
    fillEl2.style.width = '100%';
    fillEl2.classList.remove('urgent');
    numEl2.classList.remove('urgent', 'danger');
    timerInterval = { _raf: function() {} };
    return;
  }

  timeLeft = TIME_PER_TURN;
  var startedAt = Date.now();
  var fired = false;
  var rafId = null;

  var fillEl = document.getElementById('progress-fill');
  fillEl.style.transition = 'none';

  function tick() {
    var elapsed = (Date.now() - startedAt) / 1000;
    var remaining = Math.max(0, TIME_PER_TURN - elapsed);
    timeLeft = Math.ceil(remaining);
    updateTimerUI(remaining);
    if (!fired && remaining <= 0) {
      fired = true;
      autoPick();
      return;
    }
    if (!fired) rafId = requestAnimationFrame(tick);
  }

  timerInterval = { _raf: null };
  rafId = requestAnimationFrame(tick);
  timerInterval._raf = function() { cancelAnimationFrame(rafId); fired = true; };
  updateTimerUI(TIME_PER_TURN);
}

function updateTimerUI(remaining) {
  var numEl  = document.getElementById('timer-num');
  var fillEl = document.getElementById('progress-fill');
  // remaining can be undefined on first call
  var pct = (remaining !== undefined)
    ? (remaining / TIME_PER_TURN * 100)
    : 100;
  var displayNum = (remaining !== undefined) ? Math.ceil(remaining) : TIME_PER_TURN;
  numEl.textContent   = displayNum;
  fillEl.style.width  = pct + '%';
  var urgent = displayNum <= (isHardcoreActive() ? 4 : 8);
  numEl.classList.toggle('urgent',  urgent);
  fillEl.classList.toggle('urgent', urgent);
  // Hardcore danger pulse
  if (isHardcoreActive()) {
    numEl.classList.toggle('danger', displayNum <= 4);
  } else {
    numEl.classList.remove('danger');
  }
}

// ─── AUTO PICK ────────────────────────────────────────────────────────────────
function autoPick() {
  if (isRevealing) return;
  isRevealing = true;
  if (timerInterval && timerInterval._raf) timerInterval._raf(); timerInterval = null;
  if (gameMode === 'reverse' || (gameMode === 'custom' && customSubMode === 'reverse')) { autoPick_reverse(); return; }
  disableAllCatButtons();
  var PENALTY = 200;
  totalScore += PENALTY;

  var country = gameCountries[currentStep];
  var cName   = getCountryName(country);
  var flag    = country.flag || country.emoji || '🌍';
  gameLog.push({flag:flag, name:cName, catObj:null, points:PENALTY, isPenalty:true, country:country});

  // HC: no overlay, advance silently
  if (isHardcoreActive()) {
    setTimeout(function() { isRevealing = false; currentStep++; showTurn(); }, 350);
    return;
  }

  // Normal mode: show penalty overlay
  document.getElementById('total-score').textContent = totalScore;
  var overlay = document.createElement('div');
  overlay.id = 'reveal-overlay';
  overlay.innerHTML =
    '<div class="reveal-card" style="border-color:var(--accent2);">'
    + '<div class="reveal-cat-label" style="color:var(--accent2);">' + t('timeUp') + '</div>'
    + '<div class="reveal-cat-name" style="color:var(--accent2);">' + t('noAnswer') + '</div>'
    + '<div class="reveal-country"><span class="reveal-flag">' + flag + '</span>'
    + '<span class="reveal-country-name">' + cName + '</span></div>'
    + '<div style="font-family:\'DM Mono\',monospace;font-size:4em;font-weight:700;color:var(--accent2);margin:16px 0;animation:penaltyPop 0.4s cubic-bezier(0.34,1.56,0.64,1);">+' + PENALTY + '</div>'
    + '<div class="reveal-points-label" style="color:var(--accent2);">' + t('penalty') + '</div>'
    + '<button class="reveal-skip" id="reveal-skip-btn" style="border-color:var(--accent2);color:var(--accent2);">' + t('skip') + '</button>'
    + '</div>';
  var s = document.createElement('style');
  s.textContent = '@keyframes penaltyPop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}';
  overlay.appendChild(s);
  document.body.appendChild(overlay);
  var overlayClosed = false;
  function closeOverlay() {
    if (overlayClosed) return;
    overlayClosed = true;
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(function() { isRevealing = false; overlay.remove(); currentStep++; showTurn(); }, 300);
  }
  applyEmoji(overlay);
  document.getElementById('reveal-skip-btn').onclick = closeOverlay;
  setTimeout(closeOverlay, 2800);
}

// ─── HANDLE CHOICE ────────────────────────────────────────────────────────────
function handleChoice(catId) {
  if (isRevealing) return;
  if (timerInterval && timerInterval._raf) timerInterval._raf(); timerInterval = null;
  var btn = document.getElementById('cat-' + catId);
  if (!btn || btn.disabled) return;

  var country = gameCountries[currentStep];
  var rawVal  = country[catId];
  var points  = (rawVal === false || rawVal === null || rawVal === undefined) ? false : Number(rawVal);
  var cName   = getCountryName(country);
  var flag    = country.flag || country.emoji || '🌍';
  var catObj  = gameCategories.find(function(c) { return c.id === catId; });

  usedCategories[catId] = true;
  disableAllCatButtons();

  btn.innerHTML =
    '<div class="cat-btn-top"><span class="cat-icon">' + catObj.icon + '</span></div>'
    + '<span class="cat-label-text">' + catName(catObj) + '</span>'
    + '<span class="cat-badge"><span class="badge-flag">' + flag + '</span>' + cName + '</span>';
  btn.style.borderColor = 'var(--accent3)';
  btn.style.color = 'var(--accent3)';
  applyEmoji(btn);

  isRevealing = true;
  var pts = (points === false || points === null || points === undefined || isNaN(points)) ? 0 : Number(points);
  gameLog.push({flag:flag, name:cName, catObj:catObj, points:pts, isPenalty:false, country:country});

  var sd = computeStarData(country, catId);
  var lastEntry = gameLog[gameLog.length - 1]; if (lastEntry) lastEntry.starData = sd;

  if (isHardcoreActive()) {
    totalScore += pts;
    setTimeout(function() { isRevealing = false; currentStep++; showTurn(); }, 420);
  } else {
    var bestHtml = buildBestCatsPanel(country, catId);
    showReveal(flag, cName, catObj, points, function() {
      isRevealing = false;
      if (points !== false) totalScore += pts;
      document.getElementById('total-score').textContent = totalScore;
      currentStep++;
      showTurn();
    }, sd, bestHtml);
  }
}

function disableAllCatButtons() {
  document.querySelectorAll('.cat-btn').forEach(function(b) { b.disabled = true; });
}


// ─── STAR RATING HELPERS ─────────────────────────────────────────────────────
function computeStarData(country, chosenCatId) {
  // Le jeu = MINIMISER le score : etoile = valeur la plus BASSE choisie
  var chosenRaw = country[chosenCatId];
  var chosenVal = (chosenRaw === false || chosenRaw === null || chosenRaw === undefined || isNaN(Number(chosenRaw))) ? null : Number(chosenRaw);
  if (chosenVal === null) return { chosenVal:0, gameBest:0, globalBest:0, isGameBest:false, isGlobalBest:false };
  // gameBest = valeur minimale parmi les categories disponibles pour ce pays
  var gb = Infinity;
  gameCategories.forEach(function(cat) {
    var v = country[cat.id];
    if (v !== false && v !== null && v !== undefined && !isNaN(Number(v))) {
      var n = Number(v); if (n < gb) gb = n;
    }
  });
  // globalBest = valeur minimale sur TOUTES les categories connues
  var ab = Infinity;
  ALL_CATEGORIES.forEach(function(cat) {
    var v = country[cat.id];
    if (v !== false && v !== null && v !== undefined && !isNaN(Number(v))) {
      var n = Number(v); if (n < ab) ab = n;
    }
  });
  gb = gb === Infinity ? 0 : gb;
  ab = ab === Infinity ? 0 : ab;
  var isGameBest   = (chosenVal > 0 && chosenVal <= gb);
  var isGlobalBest = (chosenVal > 0 && chosenVal <= ab);
  return { chosenVal:chosenVal, gameBest:gb, globalBest:ab, isGameBest:isGameBest, isGlobalBest:isGlobalBest };
}
function computeStarDataReverse(cat, chosenIdx) {
  // Mode reverse : etoile = pays avec la valeur la plus BASSE pour cette categorie
  var country = gameCountries[chosenIdx];
  var chosenRaw = country[cat.id];
  var chosenVal = (chosenRaw===false||chosenRaw===null||chosenRaw===undefined||isNaN(Number(chosenRaw))) ? null : Number(chosenRaw);
  if (chosenVal === null) return { chosenVal:0, gameBest:0, globalBest:0, isGameBest:false, isGlobalBest:false };
  var gb = Infinity;
  gameCountries.forEach(function(c) {
    var v = c[cat.id];
    if (v !== false && v !== null && v !== undefined && !isNaN(Number(v))) {
      var n = Number(v); if (n < gb) gb = n;
    }
  });
  var ab = Infinity;
  countriesDB.forEach(function(c) {
    var v = c[cat.id];
    if (v !== false && v !== null && v !== undefined && !isNaN(Number(v))) {
      var n = Number(v); if (n < ab) ab = n;
    }
  });
  gb = gb === Infinity ? 0 : gb;
  ab = ab === Infinity ? 0 : ab;
  var isGameBest   = (chosenVal > 0 && chosenVal <= gb);
  var isGlobalBest = (chosenVal > 0 && chosenVal <= ab);
  return { chosenVal:chosenVal, gameBest:gb, globalBest:ab, isGameBest:isGameBest, isGlobalBest:isGlobalBest };
}
// Panneau 'meilleurs choix' : trier par valeur ASCENDANTE (bas = meilleur score)
function buildBestCatsPanel(country, chosenCatId) {
  var rows=[];
  gameCategories.forEach(function(cat){var v=country[cat.id];if(v!==false&&v!==null&&v!==undefined&&!isNaN(Number(v)))rows.push({cat:cat,val:Number(v)});});
  rows.sort(function(a,b){return a.val-b.val;});
  return rows.slice(0,3).map(function(r){
    var mark=r.cat.id===chosenCatId?' <span style="color:var(--accent)">&#10003;</span>':'';
    return '<div class="reveal-best-row"><span class="rbr-cat">'+r.cat.icon+' '+catName(r.cat)+mark+'</span><span class="rbr-val">'+r.val+'</span></div>';
  }).join('');
}
function buildBestCountriesPanel(cat, chosenIdx) {
  var rows=[];
  gameCountries.forEach(function(c,i){var v=c[cat.id];if(v!==false&&v!==null&&v!==undefined&&!isNaN(Number(v)))rows.push({c:c,i:i,val:Number(v)});});
  rows.sort(function(a,b){return a.val-b.val;});
  return rows.slice(0,3).map(function(r){
    var flag=r.c.flag||r.c.emoji||'';
    var mark=r.i===chosenIdx?' <span style="color:var(--accent)">&#10003;</span>':'';
    return '<div class="reveal-best-row"><span class="rbr-cat">'+flag+' '+getCountryName(r.c)+mark+'</span><span class="rbr-val">'+r.val+'</span></div>';
  }).join('');
}
function showReveal(flag, cName, catObj, finalValue, onDone, starData, bestPanelHtml) {
  var overlay = document.createElement('div');
  overlay.id = 'reveal-overlay';
  var isFalse = finalValue === false;
  var target  = isFalse ? 0 : Math.abs(finalValue);

  overlay.innerHTML =
    '<div class="reveal-card">'
    + '<div class="reveal-cat-label">' + t('catSelected') + '</div>'
    + '<div class="reveal-cat-name">' + catObj.icon + ' ' + catName(catObj) + '</div>'
    + '<div class="reveal-country"><span class="reveal-flag">' + flag + '</span>'
    + '<span class="reveal-country-name">' + cName + '</span></div>'
    + '<div class="odometer-wrap" id="odo-wrap" style="' + (isHardcoreActive() ? 'display:none' : '') + '"></div>'
    + '<div class="reveal-points-label" style="' + (isHardcoreActive() ? 'display:none' : '') + '">' + (isFalse ? t('noData') : t('ptsAdded')) + '</div>'
    + '<button class="reveal-skip" id="reveal-skip-btn">' + t('skip') + '</button>'
    + '</div>';
  document.body.appendChild(overlay);
  applyEmoji(overlay);

  var digits = target.toString().split('').map(Number);
  if (!digits.length) digits.push(0);
  var wrap = document.getElementById('odo-wrap');
  buildOdometer(wrap, digits.length);

  var animDone = false;
  var skipBtn  = document.getElementById('reveal-skip-btn');

  var revealClosed = false;
  function closeReveal() {
    if (revealClosed) return;
    revealClosed = true;
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(function() { overlay.remove(); onDone(); }, 300);
  }

  function onComplete() {
    animDone = true;
    wrap.querySelectorAll('.odo-digit-wrap').forEach(function(d) { d.classList.add('done'); });
    var slot = document.getElementById('reveal-star-slot');
    if (slot && starData && !hideScore()) {
      if (starData.isGlobalBest) {
        slot.innerHTML = '<div class="reveal-star mega">🌟</div>';
        var rect = slot.getBoundingClientRect();
        burstStars(rect.left + rect.width/2, rect.top + rect.height/2);
      } else if (starData.isGameBest) {
        slot.innerHTML = '<div class="reveal-star">⭐</div>';
      }
    }
    skipBtn.onclick = closeReveal;
    var autoDelay = (starData && !hideScore() && (starData.isGlobalBest || starData.isGameBest)) ? 2800 : 1800;
    setTimeout(function() { if (document.getElementById('reveal-overlay')) closeReveal(); }, autoDelay);
  }

  function onSkip() {
    setOdometerToFinal(wrap, digits);
    onComplete();
  }

  skipBtn.onclick = function() { animDone ? closeReveal() : onSkip(); };
  runOdometerAnimation(wrap, digits, target, isFalse, onComplete, onSkip);
}

function buildOdometer(wrap, n) {
  wrap.innerHTML = '';
  for (var i = 0; i < n; i++) {
    var dw = document.createElement('div');
    dw.className = 'odo-digit-wrap';
    var inner = document.createElement('div');
    inner.className = 'odo-digit-inner';
    for (var d = 0; d <= 9; d++) {
      var span = document.createElement('div');
      span.className = 'odo-digit';
      span.textContent = d;
      inner.appendChild(span);
    }
    var ft = document.createElement('div'); ft.className = 'odo-fade-top';
    var fb = document.createElement('div'); fb.className = 'odo-fade-bot';
    dw.appendChild(inner); dw.appendChild(ft); dw.appendChild(fb);
    wrap.appendChild(dw);
    setDigitTo(dw, 0, false);
  }
}

function setDigitTo(dw, value, animated) {
  var inner = dw.querySelector('.odo-digit-inner');
  inner.style.transition = animated ? 'transform 0.12s cubic-bezier(0.4,0,0.2,1)' : 'none';
  inner.style.transform  = 'translateY(' + (-value * 74) + 'px)';
}

function setOdometerToFinal(wrap, digits) {
  var dws = wrap.querySelectorAll('.odo-digit-wrap');
  digits.forEach(function(d, i) { setDigitTo(dws[i], d, false); });
}

function runOdometerAnimation(wrap, finalDigits, finalValue, isFalse, onComplete, onSkip) {
  if (isFalse || finalValue === 0) { setTimeout(onComplete, 600); return; }
  var DURATION = 2400;
  var start    = performance.now();
  var dws      = Array.from(wrap.querySelectorAll('.odo-digit-wrap'));
  var cancelled = false;
  var skipBtn   = document.getElementById('reveal-skip-btn');
  if (skipBtn) skipBtn.onclick = function() { cancelled = true; onSkip(); };

  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  function renderValue(val) {
    var str = Math.round(val).toString().padStart(finalDigits.length, '0');
    str.split('').forEach(function(ch, i) { if (i < dws.length) setDigitTo(dws[i], Number(ch), true); });
  }

  function tick(now) {
    if (cancelled) return;
    var t = Math.min((now - start) / DURATION, 1);
    renderValue(ease(t) * finalValue);
    if (t < 1) requestAnimationFrame(tick);
    else { renderValue(finalValue); onComplete(); }
  }
  requestAnimationFrame(tick);
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
function clearFeedback() {
  var el = document.getElementById('feedback');
  el.textContent = ''; el.className = 'feedback';
}

