// ── Ribbon mobile tabs ────────────────────────────────────────────────────────
// Sur écrans <= 540px : remplace la grille 3-col par des onglets tactiles
var MOB_BP = 540;
function isMob() { return window.innerWidth <= MOB_BP; }

// État actif par ribbon
var mobRibbonTab    = 'poss';
var mobCatRibbonTab = 'poss';

function initMobRibbons() {
  if (!isMob()) return;
  _buildMobRibbon('ribbon',    mobRibbonTab);
  _buildMobRibbon('catribbon', mobCatRibbonTab);
}

function _buildMobRibbon(prefix, activeTab) {
  var exclEl = document.getElementById(prefix + '-excl');
  if (!exclEl) return;
  var wrap = exclEl.closest('.ribbon-wrap');
  if (!wrap || wrap.classList.contains('mob-tabbed')) return; // déjà fait

  wrap.classList.add('mob-tabbed');

  // ── Onglets ────────────────────────────────────────────────────────────────
  var tabs = document.createElement('div');
  tabs.className = 'mob-ribbon-tabs';
  tabs.id = prefix + '-mob-tabs';
  var tabDefs = [
    { col: 'excl', label: t('ribbonColExcl') },
    { col: 'poss', label: t('ribbonColPoss') },
    { col: 'incl', label: t('ribbonColIncl') },
  ];
  tabDefs.forEach(function(def) {
    var btn = document.createElement('button');
    btn.className = 'mob-ribbon-tab';
    btn.dataset.col = def.col;
    btn.textContent = def.label;
    (function(col) {
      btn.addEventListener('click', function() { _switchMobTab(prefix, col); });
    })(def.col);
    tabs.appendChild(btn);
  });
  wrap.parentNode.insertBefore(tabs, wrap);

  // ── Barre d'actions ────────────────────────────────────────────────────────
  var actions = document.createElement('div');
  actions.className = 'mob-ribbon-actions';
  actions.id = prefix + '-mob-actions';
  wrap.parentNode.insertBefore(actions, wrap.nextSibling);

  // Activer l'onglet initial
  _switchMobTab(prefix, activeTab);
}

function _switchMobTab(prefix, col) {
  // Mémoriser
  if (prefix === 'ribbon') mobRibbonTab = col;
  else mobCatRibbonTab = col;

  var exclEl = document.getElementById(prefix + '-excl');
  if (!exclEl) return;
  var wrap = exclEl.closest('.ribbon-wrap');

  // Afficher la bonne colonne
  wrap.querySelectorAll('.ribbon-col').forEach(function(c) {
    c.classList.remove('mob-visible');
  });
  var targetCol = document.getElementById(prefix + '-' + col);
  if (targetCol) targetCol.closest('.ribbon-col').classList.add('mob-visible');

  // Activer le bon onglet
  var tabs = document.getElementById(prefix + '-mob-tabs');
  if (tabs) {
    tabs.querySelectorAll('.mob-ribbon-tab').forEach(function(btn) {
      btn.classList.remove('tab-excl', 'tab-poss', 'tab-incl');
      if (btn.dataset.col === col) btn.classList.add('tab-' + col);
    });
  }

  // Mettre à jour la barre d'actions
  var actions = document.getElementById(prefix + '-mob-actions');
  if (!actions) return;
  actions.innerHTML = '';

  var isCountry = (prefix === 'ribbon');
  var moveFn    = isCountry ? ribbonMove : catRibbonMove;

  var actionDefs;
  if (col === 'excl') {
    actionDefs = [
      { label: t('mobActToPoss'),    cls: 'act-poss', fn: function() { moveFn('excl','poss',false); } },
      { label: t('mobActAllToPoss'), cls: 'act-poss', fn: function() { moveFn('excl','poss',true); } },
    ];
  } else if (col === 'poss') {
    actionDefs = [
      { label: t('mobActExcl'),    cls: 'act-excl', fn: function() { moveFn('poss','excl',false); } },
      { label: t('mobActForce'),   cls: 'act-incl', fn: function() { moveFn('poss','incl',false); } },
      { label: t('mobActAllExcl'), cls: 'act-excl', fn: function() { moveFn('poss','excl',true); } },
    ];
  } else { // incl
    actionDefs = [
      { label: t('mobActRemove'), cls: 'act-poss', fn: function() { moveFn('incl','poss',false); } },
    ];
  }

  actionDefs.forEach(function(def) {
    var btn = document.createElement('button');
    btn.className = 'mob-ribbon-action ' + def.cls;
    btn.textContent = def.label;
    btn.addEventListener('click', def.fn);
    actions.appendChild(btn);
  });
}

// Réinitialiser quand on quitte le panel custom
function destroyMobRibbons() {
  ['ribbon', 'catribbon'].forEach(function(prefix) {
    var exclEl = document.getElementById(prefix + '-excl');
    if (!exclEl) return;
    var wrap = exclEl.closest('.ribbon-wrap');
    if (wrap) wrap.classList.remove('mob-tabbed');
    wrap.querySelectorAll('.ribbon-col').forEach(function(c) { c.classList.remove('mob-visible'); });
    var tabs = document.getElementById(prefix + '-mob-tabs');
    if (tabs) tabs.remove();
    var actions = document.getElementById(prefix + '-mob-actions');
    if (actions) actions.remove();
  });
  mobRibbonTab = 'poss';
  mobCatRibbonTab = 'poss';
}

// Resize : reconstruire si on repasse en mobile
var _mobResizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(_mobResizeTimer);
  _mobResizeTimer = setTimeout(function() {
    var panelCustom = document.getElementById('panel-custom');
    if (!panelCustom || panelCustom.classList.contains('hidden')) return;
    if (!isMob()) {
      destroyMobRibbons();
    } else {
      initMobRibbons();
    }
  }, 200);
});

