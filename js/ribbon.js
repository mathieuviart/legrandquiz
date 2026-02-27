// ─── COUNTRY RIBBON SELECTOR ──────────────────────────────────────────────────
// State: each country is in exactly one of 3 buckets
// ribbonState[i] = 'excl' | 'poss' | 'incl'  (i = index in countriesDB)
var ribbonState    = {};   // countriesDB index → 'excl'|'poss'|'incl'
var ribbonSelected = {};   // countriesDB index → true (multi-select)
var ribbonDragSrc  = null; // {idx, fromCol}

function ribbonInit() {
  // Called when openCustomPanel — reset to default state
  ribbonState    = {};
  ribbonSelected = {};
  for (var i = 0; i < countriesDB.length; i++) {
    ribbonState[i] = 'poss';
  }
  ribbonFilter('');
  ribbonRender();
}

function ribbonFilter(query) {
  document.getElementById('ribbon-search').value = query;
  ribbonRender(query.toLowerCase().trim());
}

function ribbonRender(filter) {
  filter = filter || '';
  var cols = { excl: [], poss: [], incl: [] };
  for (var i = 0; i < countriesDB.length; i++) {
    var c    = countriesDB[i];
    var name = (currentLang === 'de' ? (c.country_DE || c.country_EN || c.country_FR) :
                currentLang === 'en' ? (c.country_EN || c.country_FR) :
                currentLang === 'ua' ? (c.country_UA || c.country_FR) :
                (c.country_FR || c.country_EN)) || '';
    if (filter && name.toLowerCase().indexOf(filter) === -1) continue;
    cols[ribbonState[i]].push({ i: i, name: name, flag: c.flag || '' });
  }

  // Sort each column alphabetically
  ['excl','poss','incl'].forEach(function(col) {
    cols[col].sort(function(a,b){ return a.name.localeCompare(b.name); });
    var el = document.getElementById('ribbon-' + col);
    el.innerHTML = '';
    cols[col].forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'ribbon-item' + (ribbonSelected[item.i] ? ' selected ' + col : '');
      div.dataset.idx = item.i;
      div.draggable   = true;
      div.innerHTML   =
        '<span class="ribbon-item-flag">' + item.flag + '</span>' +
        '<span class="ribbon-item-name"  title="' + item.name + '">' + item.name + '</span>';
      div.addEventListener('click', function(e) { ribbonToggleSelect(parseInt(this.dataset.idx)); });
      div.addEventListener('dragstart', function(e) {
        ribbonDragSrc = { idx: parseInt(this.dataset.idx), fromCol: ribbonState[parseInt(this.dataset.idx)] };
        e.dataTransfer.effectAllowed = 'move';
      });
      el.appendChild(div);
    });
  });

  applyEmoji(document.getElementById('ribbon-excl'));
  applyEmoji(document.getElementById('ribbon-poss'));
  applyEmoji(document.getElementById('ribbon-incl'));
  ribbonUpdateSlots();
}

function ribbonToggleSelect(idx) {
  if (ribbonSelected[idx]) {
    delete ribbonSelected[idx];
  } else {
    ribbonSelected[idx] = true;
  }
  ribbonRender(document.getElementById('ribbon-search').value.toLowerCase().trim());
}

function ribbonMove(fromCol, toCol, all) {
  var moved = false;
  if (all) {
    // Only move between excl ↔ poss (the Add All / Remove All restriction)
    if ((fromCol === 'excl' && toCol === 'poss') || (fromCol === 'poss' && toCol === 'excl')) {
      for (var i = 0; i < countriesDB.length; i++) {
        if (ribbonState[i] === fromCol) { ribbonState[i] = toCol; moved = true; }
      }
    }
  } else {
    // Move selected items; if none selected, move all visible in fromCol
    var hasSelection = Object.keys(ribbonSelected).some(function(k) {
      return ribbonState[parseInt(k)] === fromCol;
    });
    if (hasSelection) {
      Object.keys(ribbonSelected).forEach(function(k) {
        var idx = parseInt(k);
        if (ribbonState[idx] === fromCol) {
          ribbonState[idx] = toCol; delete ribbonSelected[idx]; moved = true;
        }
      });
    } else {
      // No selection: move all visible (filtered) items from fromCol
      var filter = document.getElementById('ribbon-search').value.toLowerCase().trim();
      for (var i = 0; i < countriesDB.length; i++) {
        if (ribbonState[i] !== fromCol) continue;
        var c = countriesDB[i];
        var name = (currentLang === 'de' ? (c.country_DE || c.country_EN || c.country_FR) :
                    currentLang === 'en' ? (c.country_EN || c.country_FR) :
                    currentLang === 'ua' ? (c.country_UA || c.country_FR) :
                    (c.country_FR || c.country_EN)) || '';
        if (!filter || name.toLowerCase().indexOf(filter) !== -1) {
          ribbonState[i] = toCol; moved = true;
        }
      }
    }
  }
  if (moved) ribbonRender(document.getElementById('ribbon-search').value.toLowerCase().trim());
}

function ribbonDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function ribbonDrop(e, toCol) {
  e.preventDefault();
  if (!ribbonDragSrc) return;
  var idx = ribbonDragSrc.idx;
  var fromCol = ribbonDragSrc.fromCol;
  ribbonDragSrc = null;
  // Only allow valid moves: excl↔poss and poss→incl and incl→poss
  var validMoves = {
    'excl-poss':true, 'poss-excl':true,
    'poss-incl':true, 'incl-poss':true,
    'excl-incl':false, 'incl-excl':false
  };
  if (validMoves[fromCol + '-' + toCol]) {
    ribbonState[idx] = toCol;
    delete ribbonSelected[idx];
    ribbonRender(document.getElementById('ribbon-search').value.toLowerCase().trim());
  }
}

function ribbonUpdateSlots() {
  var n      = parseInt(document.getElementById('custom-n-slider').value, 10) || 8;
  var nIncl  = Object.keys(ribbonState).filter(function(k){ return ribbonState[k]==='incl'; }).length;
  var pct    = Math.min(nIncl / n * 100, 100);
  var fill   = document.getElementById('ribbon-slots-fill');
  fill.style.width = pct + '%';
  fill.className   = 'ribbon-slots-fill' + (nIncl > n ? ' over' : nIncl === n ? ' full' : '');
  document.getElementById('ribbon-slots-txt').textContent  = nIncl + ' / ' + n + ' ' + t('ribbonSlotsTxt');
  document.getElementById('ribbon-incl-count').textContent = nIncl + ' ' + (nIncl > 1 ? t('ribbonSlotsForcedP') : t('ribbonSlotsForced'));
}

// Called by the N slider to update the slots indicator live
function ribbonOnSliderChange(val) {
  document.getElementById('custom-n-display').textContent = val;
  ribbonUpdateSlots();
  catRibbonUpdateSlots();
}


// ─── CATEGORY RIBBON SELECTOR ─────────────────────────────────────────────────
// catRibbonState[i] = 'excl'|'poss'|'incl'  (i = index in ALL_CATEGORIES)
var catRibbonState    = {};
var catRibbonSelected = {};
var catRibbonDragSrc  = null;

function catRibbonInit() {
  catRibbonState    = {};
  catRibbonSelected = {};
  for (var i = 0; i < ALL_CATEGORIES.length; i++) {
    catRibbonState[i] = 'poss';
  }
  catRibbonRender();
}

function catRibbonFilter(query) {
  document.getElementById('catribbon-search').value = query;
  catRibbonRender(query.toLowerCase().trim());
}

function catRibbonRender(filter) {
  filter = filter || '';
  var cols = { excl: [], poss: [], incl: [] };
  for (var i = 0; i < ALL_CATEGORIES.length; i++) {
    var cat  = ALL_CATEGORIES[i];
    var name = catName(cat);
    if (filter && name.toLowerCase().indexOf(filter) === -1) continue;
    cols[catRibbonState[i]].push({ i: i, name: name, icon: cat.icon || '📊' });
  }

  ['excl','poss','incl'].forEach(function(col) {
    cols[col].sort(function(a,b){ return a.name.localeCompare(b.name); });
    var el = document.getElementById('catribbon-' + col);
    el.innerHTML = '';
    cols[col].forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'ribbon-item' + (catRibbonSelected[item.i] ? ' selected ' + col : '');
      div.dataset.idx = item.i;
      div.draggable   = true;
      div.innerHTML   =
        '<span class="ribbon-item-flag">' + item.icon + '</span>' +
        '<span class="ribbon-item-name" title="' + item.name + '">' + item.name + '</span>';
      div.addEventListener('click', function() { catRibbonToggleSelect(parseInt(this.dataset.idx)); });
      div.addEventListener('dragstart', function(e) {
        catRibbonDragSrc = { idx: parseInt(this.dataset.idx), fromCol: catRibbonState[parseInt(this.dataset.idx)] };
        e.dataTransfer.effectAllowed = 'move';
      });
      el.appendChild(div);
    });
  });

  applyEmoji(document.getElementById('catribbon-excl'));
  applyEmoji(document.getElementById('catribbon-poss'));
  applyEmoji(document.getElementById('catribbon-incl'));
  catRibbonUpdateSlots();
}

function catRibbonToggleSelect(idx) {
  if (catRibbonSelected[idx]) { delete catRibbonSelected[idx]; }
  else { catRibbonSelected[idx] = true; }
  catRibbonRender(document.getElementById('catribbon-search').value.toLowerCase().trim());
}

function catRibbonMove(fromCol, toCol, all) {
  var moved = false;
  if (all) {
    if ((fromCol === 'excl' && toCol === 'poss') || (fromCol === 'poss' && toCol === 'excl')) {
      for (var i = 0; i < ALL_CATEGORIES.length; i++) {
        if (catRibbonState[i] === fromCol) { catRibbonState[i] = toCol; moved = true; }
      }
    }
  } else {
    var hasSelection = Object.keys(catRibbonSelected).some(function(k) {
      return catRibbonState[parseInt(k)] === fromCol;
    });
    if (hasSelection) {
      Object.keys(catRibbonSelected).forEach(function(k) {
        var idx = parseInt(k);
        if (catRibbonState[idx] === fromCol) {
          catRibbonState[idx] = toCol; delete catRibbonSelected[idx]; moved = true;
        }
      });
    } else {
      var filter = document.getElementById('catribbon-search').value.toLowerCase().trim();
      for (var i = 0; i < ALL_CATEGORIES.length; i++) {
        if (catRibbonState[i] !== fromCol) continue;
        var name = catName(ALL_CATEGORIES[i]);
        if (!filter || name.toLowerCase().indexOf(filter) !== -1) {
          catRibbonState[i] = toCol; moved = true;
        }
      }
    }
  }
  if (moved) catRibbonRender(document.getElementById('catribbon-search').value.toLowerCase().trim());
}

function catRibbonDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function catRibbonDrop(e, toCol) {
  e.preventDefault();
  if (!catRibbonDragSrc) return;
  var idx = catRibbonDragSrc.idx;
  var fromCol = catRibbonDragSrc.fromCol;
  catRibbonDragSrc = null;
  var validMoves = {
    'excl-poss':true, 'poss-excl':true,
    'poss-incl':true, 'incl-poss':true,
    'excl-incl':false, 'incl-excl':false
  };
  if (validMoves[fromCol + '-' + toCol]) {
    catRibbonState[idx] = toCol;
    delete catRibbonSelected[idx];
    catRibbonRender(document.getElementById('catribbon-search').value.toLowerCase().trim());
  }
}

function catRibbonUpdateSlots() {
  var n     = parseInt(document.getElementById('custom-n-slider').value, 10) || 8;
  var nIncl = Object.keys(catRibbonState).filter(function(k){ return catRibbonState[k]==='incl'; }).length;
  var pct   = Math.min(nIncl / n * 100, 100);
  var fill  = document.getElementById('catribbon-slots-fill');
  if (!fill) return;
  fill.style.width = pct + '%';
  fill.className   = 'ribbon-slots-fill' + (nIncl > n ? ' over' : nIncl === n ? ' full' : '');
  document.getElementById('catribbon-slots-txt').textContent  = nIncl + ' / ' + n + ' ' + t('ribbonSlotsTxt');
  document.getElementById('catribbon-incl-count').textContent = nIncl + ' ' + (nIncl > 1 ? t('ribbonCatForcedP') : t('ribbonCatForced'));
}

// Returns a pool of ALL_CATEGORIES indices filtered according to catRibbon state
function getCatRibbonPool() {
  var included = [], possible = [];
  if (Object.keys(catRibbonState).length === 0) {
    for (var i = 0; i < ALL_CATEGORIES.length; i++) possible.push(i);
    return { included: included, possible: possible };
  }
  for (var i = 0; i < ALL_CATEGORIES.length; i++) {
    if (catRibbonState[i] === 'incl') included.push(i);
    else if (catRibbonState[i] === 'poss') possible.push(i);
  }
  if (included.length + possible.length < 2) {
    for (var i = 0; i < ALL_CATEGORIES.length; i++) possible.push(i);
  }
  return { included: included, possible: possible };
}
