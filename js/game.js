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

  document.body.classList.remove('hardcore', 'custom-mode', 'reverse-mode');
  if (gameMode === 'custom') {
    if (!seedOverride) {
      N_TURNS = parseInt(document.getElementById('custom-n-slider').value, 10) || 8;
    }
    TIME_PER_TURN = customTimeSelected;
    document.body.classList.add('custom-mode');
    document.getElementById('panel-custom').classList.add('hidden');
    document.getElementById('panel-setup').classList.add('hidden');
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
  N_TURNS = gameCountries.length;
  currentSeed    = seed;
  currentStep    = 0;
  totalScore     = 0;
  usedCategories = {};
  gameLog        = [];
  isRevealing    = false;
  if (typeof resetHints === 'function') resetHints();

  showCountdown(function() {
    document.getElementById('panel-game').classList.remove('hidden');
    document.getElementById('game-seed-display').textContent = currentSeed;
    history.replaceState(null, '', '#seed=' + encodeURIComponent(currentSeed));
    renderCategoryButtons();
    showTurn();
  });
}

function startWithSeedInput() {
  var raw = document.getElementById('seed-input').value.trim();
  if (!raw) { alert(t('enterSeed')); return; }
  var seed = raw.replace(/\s+/g, '');
  startGame('custom', seed);
}

// ─── CATEGORY BUTTONS ─────────────────────────────────────────────────────────
function makeCatBtnHTML(cat) {
  return '<div class="cat-btn-top">'
       + '<span class="cat-icon">' + cat.icon + '</span>'
       + '<span class="cat-btn-actions">'
       + '<span class="cat-sort-btn" data-catid="' + cat.id + '">⇅</span>'
       + '<span class="cat-info-btn" data-catid="' + cat.id + '">i</span>'
       + '</span>'
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
      if (e.target.closest('.cat-sort-btn')) return;
      handleChoice(cat.id);
    });
    grid.appendChild(btn);
  });
  attachInfoListeners();
}

// ─── RERENDER CURRENT TURN ON LANG CHANGE ─────────────────────────────────────
function rerenderCurrentTurn() {
  var inGame = (document.getElementById('panel-game') &&
                !document.getElementById('panel-game').classList.contains('hidden'));
  if (!inGame) return;
  if (currentStep >= gameCountries.length && currentStep >= gameCategories.length) return;

  var isReverse = (gameMode === 'reverse' ||
                   (gameMode === 'custom' && customSubMode === 'reverse'));

  if (isReverse) {
    if (currentStep < gameCategories.length) {
      var cat = gameCategories[currentStep];
      document.getElementById('reverse-cat-name').textContent    = catName(cat);
      document.getElementById('reverse-cat-tooltip').textContent = catDesc(cat);
      document.getElementById('turn-label').textContent =
        t('reverseTurn') + ' ' + (currentStep + 1) + ' ' + t('of') + ' ' + gameCategories.length;
    }
  } else {
    if (currentStep < gameCountries.length) {
      var c = gameCountries[currentStep];
      document.getElementById('country-name').textContent = getCountryName(c);
      document.getElementById('turn-label').textContent =
        t('turn') + ' ' + (currentStep + 1) + ' ' + t('of') + ' ' + gameCountries.length;

      var btn1 = document.getElementById('hint-btn-1');
      var btn2 = document.getElementById('hint-btn-2');
      if (btn1 && !btn1.classList.contains('revealed')) {
        btn1.innerHTML = '\uD83D\uDCA1 ' + t('hint1btn');
      }
      if (btn2 && !btn2.classList.contains('revealed')) {
        btn2.innerHTML = '\uD83D\uDD0D ' + t('hint2btn');
      }

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

// ─── TOOLTIP SYSTEM ──────────────────────────────────────────────────────────
// Desktop  : mouseenter shows, mouseleave schedules hide (counter-based to
//            survive rapid i→⇅ transitions without flicker).
// Mobile   : purely tap-to-toggle. mouseenter/mouseleave are IGNORED on touch
//            devices because they fire unreliably after touchend and cause the
//            flash-then-close bug. A global touchstart listener on the document
//            closes any open tooltip when the user taps outside it.

var _tooltipHideTimer   = null;
var _mouseOverTooltipUI = 0;  // counter for desktop hover zone

// after hiding, suppress any re-opening for a short window to avoid ghost flashes
var _tooltipSuppressUntil = 0;

// Detect touch device once (re-evaluated each call is fine too)
function _isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

function _tooltipUIEnter() {
  _mouseOverTooltipUI++;
  _cancelTooltipHide();
}

function _tooltipUILeave() {
  _mouseOverTooltipUI--;
  _cancelTooltipHide();
  _tooltipHideTimer = setTimeout(function() {
    if (_mouseOverTooltipUI <= 0) {
      _mouseOverTooltipUI = 0;
      hideTooltip();
    }
  }, 60);
}

function _cancelTooltipHide() {
  if (_tooltipHideTimer) { clearTimeout(_tooltipHideTimer); _tooltipHideTimer = null; }
}

function hideTooltip() {
  _cancelTooltipHide();
  _mouseOverTooltipUI = 0;
  var tip = document.getElementById('cat-tooltip');
  if (!tip) return;
  tip.classList.remove('visible');
  tip.dataset.openedBy = '';
  tip.dataset.mode = '';
  // Also close reverse info tooltip for consistency
  var reverseTt = document.getElementById('reverse-cat-tooltip');
  if (reverseTt) reverseTt.classList.remove('open');
  // blur any focused element to clear :active styling on buttons
  if (document.activeElement && document.activeElement.classList.contains('reverse-sort-btn')) {
    document.activeElement.blur();
  }
  // suppress immediate reopening (e.g. synthetic click) for 400ms
  _tooltipSuppressUntil = Date.now() + 400;
}


function _positionTooltip(tip, anchor) {
  // On mobile: center horizontally on screen, appear above the button
  // so it's not hidden under the finger.
  var rect = anchor.getBoundingClientRect();
  var tw   = Math.min(280, window.innerWidth - 16);
  var left, top;
  if (_isTouchDevice()) {
    left = (window.innerWidth - tw) / 2;
    // prefer above; fall back to below if not enough room
    top = rect.top - 8 + window.scrollY;
    if (top - 120 < window.scrollY) {
      top = rect.bottom + 8 + window.scrollY;
    } else {
      top = rect.top - 8 + window.scrollY;  // will be shifted up by CSS transform
    }
  } else {
    left = rect.left + rect.width / 2 - tw / 2;
    top  = rect.bottom + 8 + window.scrollY;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  }
  tip.style.left  = left + 'px';
  tip.style.top   = top  + 'px';
  tip.style.width = tw   + 'px';
}

// Helper to show the shared cat-tooltip; we keep the old positioning logic but
// ensure the bubble is hidden while we measure its height/width so that the CSS
// transition never fires prematurely (this was causing the "ghost" flash on mobile).
function _showCatTooltip(catId, anchor, mode) {
  // suppress reopening if it was just hidden a moment ago
  if (Date.now() < _tooltipSuppressUntil) return;

  var cat = gameCategories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  var tip = document.getElementById('cat-tooltip');
  _cancelTooltipHide();
  tip.dataset.mode     = mode;
  tip.dataset.openedBy = mode + '-' + catId;

  if (mode === 'info') {
    document.getElementById('tt-title').textContent = cat.icon + ' ' + catName(cat);
    document.getElementById('tt-body').textContent  = catDesc(cat);
  } else {
    document.getElementById('tt-title').innerHTML  = '⇅ ' + catName(cat);
    document.getElementById('tt-body').textContent = catSort(cat);
  }

  // temporarily hide the tip off-screen while we compute its size so the
  // CSS transition can't flash; this mirrors the logic added to hints.js.
  tip.style.visibility = 'hidden';
  tip.style.position = 'fixed';
  tip.style.top = '-9999px';
  tip.classList.add('visible');
  var tipH = tip.offsetHeight;
  tip.classList.remove('visible');
  tip.style.visibility = '';
  // Only position on desktop; on mobile, CSS .visible handles all positioning
  if (!_isTouchDevice()) {
    _positionTooltip(tip, anchor);
  }
  tip.classList.add('visible');
}


function showTooltip(catId, anchor) {
  _showCatTooltip(catId, anchor, 'info');
}

function showSortTooltip(catId, anchor) {
  // If we're in reverse mode, show the info-style dropdown (reverse-cat-tooltip)
  var isReverse = (gameMode === 'reverse' || (gameMode === 'custom' && customSubMode === 'reverse'));
  if (isReverse) {
    // close floating cat-tooltip if present
    var floating = document.getElementById('cat-tooltip');
    if (floating) { floating.classList.remove('visible'); floating.dataset.openedBy = ''; floating.dataset.mode = ''; }
    var el = document.getElementById('reverse-cat-tooltip');
    var cat = gameCategories.find(function(c) { return c.id === catId; });
    if (!el || !cat) return;
    // toggle behavior: if already open for this sort, close it
    if (el.classList.contains('open') && el.dataset.openedBy === 'sort-' + catId) {
      el.classList.remove('open'); el.dataset.openedBy = '';
    } else {
      el.dataset.openedBy = 'sort-' + catId;
      el.textContent = catSort(cat);
      el.classList.add('open');
    }
    return;
  }
  _showCatTooltip(catId, anchor, 'sort');
}

// Close tooltip when tapping outside on mobile
function _initGlobalTouchClose() {
  if (document._tooltipTouchCloseAttached) return;
  document._tooltipTouchCloseAttached = true;
 
    // Close tooltips when tapping outside on mobile
  document.addEventListener('touchstart', function(e) {
    var tip = document.getElementById('cat-tooltip');
     if (tip && tip.classList.contains('visible')) {
    // If touch is on the tooltip itself → do nothing (let it stay open)
       if (tip.contains(e.target)) return;
    // If touch is on a tooltip-trigger button → the button handler will deal with it
       if (e.target.closest('.cat-info-btn') || e.target.closest('.cat-sort-btn') ||
           e.target.closest('.reverse-sort-btn')) return;
       hideTooltip();
     }
  }, { passive: true });
 
    // Also close reverse info tooltip when clicking outside in reverse mode
    document.addEventListener('click', function(e) {
      var reverseTt = document.getElementById('reverse-cat-tooltip');
      if (!reverseTt || !reverseTt.classList.contains('open')) return;
      // If click is on the tooltip itself → do nothing (let it stay open)
      if (reverseTt.contains(e.target)) return;
      // If click is on the info button → the button handler will deal with it
      if (e.target.closest('.reverse-info-toggle')) return;
      reverseTt.classList.remove('open');
    }, { passive: true });
}

// Helper: attach touch-and-click to a tooltip trigger button
// showFn(catId, anchor) — the function that populates + shows the tooltip
// openedByKey — the string stored in tip.dataset.openedBy when this btn is active
function _attachTooltipTrigger(clone, openedByKey, showFn) {
  var touch = _isTouchDevice();

  if (touch) {
    // ── MOBILE: tap-to-toggle only ────────────────────────────────────────
    clone.addEventListener('touchend', function(e) {
      e.preventDefault();   // prevent ghost click + page scroll
      e.stopPropagation();
      var tip = document.getElementById('cat-tooltip');
      if (tip.classList.contains('visible') && tip.dataset.openedBy === openedByKey) {
        hideTooltip();
      } else {
        showFn(clone.dataset.catid, clone);
      }
    });
  } else {
    // ── DESKTOP: hover + click-to-toggle ─────────────────────────────────
    clone.addEventListener('mouseenter', function() {
      _tooltipUIEnter();
      showFn(clone.dataset.catid, clone);
    });
    clone.addEventListener('mouseleave', _tooltipUILeave);
    clone.addEventListener('click', function(e) {
      e.stopPropagation();
      var tip = document.getElementById('cat-tooltip');
      if (tip.classList.contains('visible') && tip.dataset.openedBy === openedByKey) {
        hideTooltip();
      } else {
        showFn(clone.dataset.catid, clone);
      }
    });
  }
}

// Variant that only responds to explicit clicks/taps – no hover logic.
// Used for reverse mode: click on desktop, tap on mobile (same as normal mode on mobile, but no hover on desktop).
function _attachTooltipClickOnly(el, openedByKey, showFn) {
  if (_isTouchDevice()) {
    // ── MOBILE: exactly like normal mode (tap-to-toggle) ────────────────
    el.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var tip = document.getElementById('cat-tooltip');
      if (tip.classList.contains('visible') && tip.dataset.openedBy === openedByKey) {
        hideTooltip();
      } else {
        showFn(el.dataset.catid, el);
      }
    });
  } else {
    // ── DESKTOP: click-only, no hover ──────────────────────────────────
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var tip = document.getElementById('cat-tooltip');
      if (tip.classList.contains('visible') && tip.dataset.openedBy === openedByKey) {
        hideTooltip();
      } else {
        showFn(el.dataset.catid, el);
      }
    });
  }
}

function attachInfoListeners() {
  _initGlobalTouchClose();

  // ── Info buttons (i) ──────────────────────────────────────────────────────
  document.querySelectorAll('.cat-info-btn').forEach(function(el) {
    var clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    _attachTooltipTrigger(clone, 'info-' + clone.dataset.catid, showTooltip);
  });

  // ── Sort buttons (⇅) ─────────────────────────────────────────────────────
  document.querySelectorAll('.cat-sort-btn').forEach(function(el) {
    var clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    _attachTooltipTrigger(clone, 'sort-' + clone.dataset.catid, showSortTooltip);
  });

  // ── Tooltip bubble: keep open while hovered (desktop only) ───────────────
  var tip = document.getElementById('cat-tooltip');
  if (!tip.dataset.listenerAttached) {
    tip.dataset.listenerAttached = '1';
    if (!_isTouchDevice()) {
      tip.addEventListener('mouseenter', _tooltipUIEnter);
      tip.addEventListener('mouseleave', _tooltipUILeave);
    }
    // On touch: tapping inside the tooltip does nothing (global handler ignores it)
  }
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
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      (function(catId) {
        newBtn.addEventListener('click', function(e) {
          if (e.target.closest('.cat-info-btn')) return;
          if (e.target.closest('.cat-sort-btn')) return;
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
  // make sure any open cat-tooltip from normal mode is shut, removing ghost flashes
  hideTooltip();
  var cat = gameCategories[currentStep];
  document.getElementById('turn-label').textContent = t('reverseTurn') + ' ' + (currentStep+1) + ' ' + t('of') + ' ' + gameCategories.length;
  document.getElementById('total-score').textContent = totalScore;

  document.getElementById('reverse-cat-icon').textContent = cat.icon;
  applyEmoji(document.getElementById('reverse-cat-icon'));
  document.getElementById('reverse-cat-name').textContent = catName(cat);
  document.getElementById('reverse-cat-tooltip').textContent = catDesc(cat);
  document.getElementById('reverse-cat-tooltip').classList.remove('open');

  // Update reverse sort button
  var sortBtn = document.getElementById('reverse-sort-btn');
  if (sortBtn) {
    sortBtn.dataset.catid = cat.id;
    var newSortBtn = sortBtn.cloneNode(true);
    sortBtn.parentNode.replaceChild(newSortBtn, sortBtn);
    // reverse mode should use click-only tooltips to avoid hover activation
    if (gameMode === 'reverse') {
      _attachTooltipClickOnly(newSortBtn, 'sort-' + cat.id, showSortTooltip);
    } else {
      _attachTooltipTrigger(newSortBtn, 'sort-' + cat.id, showSortTooltip);
    }
  }

  renderCountryButtons();
  clearFeedback();
  startTimer();
}

function toggleReverseCatInfo() {
  // Close the sort tooltip before toggling info
  var sortTt = document.getElementById('cat-tooltip');
  if (sortTt && sortTt.classList.contains('visible')) {
    sortTt.classList.remove('visible');
    sortTt.dataset.openedBy = '';
    sortTt.dataset.mode = '';
  }
  // Now toggle the info tooltip
  var el = document.getElementById('reverse-cat-tooltip');
  var cat = gameCategories[currentStep];
  if (!el) return;
  if (el.classList.contains('open') && el.dataset.openedBy === 'info-' + (cat ? cat.id : '')) {
    el.classList.remove('open');
    el.dataset.openedBy = '';
  } else {
    el.dataset.openedBy = 'info-' + (cat ? cat.id : '');
    el.textContent = cat ? catDesc(cat) : '';
    el.classList.add('open');
  }
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
  var pct = (remaining !== undefined)
    ? (remaining / TIME_PER_TURN * 100)
    : 100;
  var displayNum = (remaining !== undefined) ? Math.ceil(remaining) : TIME_PER_TURN;
  numEl.textContent   = displayNum;
  fillEl.style.width  = pct + '%';
  var urgent = displayNum <= (isHardcoreActive() ? 4 : 8);
  numEl.classList.toggle('urgent',  urgent);
  fillEl.classList.toggle('urgent', urgent);
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

  if (isHardcoreActive()) {
    setTimeout(function() { isRevealing = false; currentStep++; showTurn(); }, 350);
    return;
  }

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
  var chosenRaw = country[chosenCatId];
  var chosenVal = (chosenRaw === false || chosenRaw === null || chosenRaw === undefined || isNaN(Number(chosenRaw))) ? null : Number(chosenRaw);
  if (chosenVal === null) return { chosenVal:0, gameBest:0, globalBest:0, isGameBest:false, isGlobalBest:false };
  var gb = Infinity;
  gameCategories.forEach(function(cat) {
    var v = country[cat.id];
    if (v !== false && v !== null && v !== undefined && !isNaN(Number(v))) {
      var n = Number(v); if (n < gb) gb = n;
    }
  });
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
