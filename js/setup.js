// ─── CUSTOM MODE ──────────────────────────────────────────────────────────────
var customTimeSelected = 20;
var customSubMode = 'normal'; // 'normal' | 'hardcore' | 'reverse'

// list of category IDs used by the “Sport Enjoyer” preset; keeps only
// rugby (men), football men/women and men’s basketball.
var SPORT_CAT_IDS = [
  'classement_rugby_H',
  'classement_fifa_H',
  'classement_fifa_F',
  'classement_bball_M'
];

function selectSubModePill(mode) {
  customSubMode = mode;
  ['normal','hardcore','reverse'].forEach(function(m) {
    var el = document.getElementById('submode-pill-' + m);
    if (!el) return;
    el.classList.remove('active-normal','active-hardcore','active-reverse');
    if (m === mode) el.classList.add('active-' + mode);
  });
}

var TIME_STEPS = [1, 5, 10, 15, 20, 30, 60, 0]; // 0 = infini

function selectTimeSlider(idx) {
  idx = parseInt(idx, 10);
  customTimeSelected = TIME_STEPS[idx];
  var labels = ['1s','5s','10s','15s','20s','30s','60s','∞'];
  document.getElementById('time-slider-val').textContent = labels[idx];
  // Update tick highlights
  var ticks = document.querySelectorAll('.time-slider-ticks span');
  ticks.forEach(function(t, i) {
    t.classList.toggle('active-tick', i === idx);
  });
}

function selectDraftPill(mode) {
  ['auto','cats','countries'].forEach(function(m) {
    var el = document.getElementById('draft-pill-' + m);
    if (el) el.classList.toggle('active', m === mode);
  });
  draftMode = mode;
}

function toggleDraftInfo() {
  var el = document.getElementById('draft-tooltip');
  el.classList.toggle('visible');
  // Populate with current lang
  el.textContent = t('customDraftInfo');
}

function openCustomPanel() {
  // Sur mobile : initialiser les onglets ribbon après rendu
  if (isMob()) {
    setTimeout(initMobRibbons, 80);
  }
  document.getElementById('panel-setup').classList.add('hidden');
  document.getElementById('panel-custom').classList.remove('hidden');
  if (countriesDB.length > 0 && Object.keys(ribbonState).length === 0) {
    ribbonInit();
  }
  if (ALL_CATEGORIES.length > 0 && Object.keys(catRibbonState).length === 0) {
    catRibbonInit();
  }
  ribbonUpdateSlots();
  catRibbonUpdateSlots();
}

function closeCustomPanel() {
  if (isMob()) destroyMobRibbons();
  document.getElementById('panel-custom').classList.add('hidden');
  document.getElementById('panel-setup').classList.remove('hidden');
}


function togglePresets() {
  var toggle = document.getElementById('presets-toggle');
  var body   = document.getElementById('presets-body');
  toggle.classList.toggle('open');
  body.classList.toggle('open');
}

function applyPreset(name, btn) {
  // S'assurer que les ribbons sont initialisés
  if (Object.keys(ribbonState).length === 0)    ribbonInit();
  if (Object.keys(catRibbonState).length === 0) catRibbonInit();

  // make sure preset code lists exist (build once from country data)
  ensurePresets();

  // Helper : set country ribbon by code whitelist
  function setCountryByList(allowedCodes) {
    for (var i = 0; i < countriesDB.length; i++) {
      var code = (countriesDB[i].country_code || '').toUpperCase();
      ribbonState[i] = (allowedCodes.indexOf(code) !== -1) ? 'poss' : 'excl';
    }
    ribbonSelected = {};
  }
  // Helper : reset all countries to possible
  function resetCountries() {
    for (var i = 0; i < countriesDB.length; i++) ribbonState[i] = 'poss';
    ribbonSelected = {};
  }
  // Helper : reset all cats to possible
  function resetCats() {
    for (var i = 0; i < ALL_CATEGORIES.length; i++) catRibbonState[i] = 'poss';
    catRibbonSelected = {};
  }

  // Helper to safely set country list from a global codes array, with a fallback
  function safeSetCodes(varName) {
    try {
      var codes = window[varName];
      if (codes && Array.isArray(codes)) {
        setCountryByList(codes);
      } else {
        console.warn('Preset codes not found or invalid:', varName);
        resetCountries();
      }
    } catch (e) {
      console.warn('Error accessing preset codes:', varName, e);
      resetCountries();
    }
    resetCats();
    setPresetDefaults();
  }

  // ensurePresets() builds the various *_CODES arrays from the country database
  var _presetsDone = false;
  function ensurePresets() {
    if (_presetsDone) return;
    if (!countriesDB || countriesDB.length === 0) return; // can't build yet
    _presetsDone = true;

    // utility for description text (fr preferred)
    function descText(code) {
      var d = COUNTRY_DESCRIPTIONS[code];
      if (!d) return '';
      return (d.fr || d.en || '').toString().toLowerCase();
    }

    // initialize empty arrays on window
    window.EUROPEAN_CODES = [];
    window.AFRICAN_CODES   = [];
    window.AMERICAS_CODES  = [];
    window.ASIAN_CODES     = [];
    window.OCEANIA_CODES   = [];
    window.TOP100_PIB_CODES = [];
    window.SMALL_COUNTRIES_CODES = [];
    window.FRANCE_NEIGHBORS_CODES = ['BE','LU','DE','CH','IT','ES','AD','MC'];
    window.LANDLOCKED_CODES = [];
    window.ISLANDS_CODES = [];

    countriesDB.forEach(function(c) {
      var code = (c.country_code||'').toUpperCase();
      var d = descText(code);
      if (/afrique/.test(d)) window.AFRICAN_CODES.push(code);
      if (/am[eé]rique/.test(d)) window.AMERICAS_CODES.push(code);
      if (/asie/.test(d)) window.ASIAN_CODES.push(code);
      if (/europ/.test(d)) window.EUROPEAN_CODES.push(code);
      if (/oc[eé]an|pacifique/.test(d) || code==='AU' || code==='NZ') window.OCEANIA_CODES.push(code);
      if (/île|archipel|island/.test(d)) window.ISLANDS_CODES.push(code);
      if (/enclav|landlocked/.test(d)) window.LANDLOCKED_CODES.push(code);
      if (typeof c.pib === 'number' && c.pib <= 100) window.TOP100_PIB_CODES.push(code);
      if (typeof c.nb_habitant === 'number' && c.nb_habitant >= 200) window.SMALL_COUNTRIES_CODES.push(code);
    });

    // remove duplicates just in case
    ['EUROPEAN_CODES','AFRICAN_CODES','AMERICAS_CODES','ASIAN_CODES','OCEANIA_CODES','LANDLOCKED_CODES','ISLANDS_CODES'].forEach(function(varName) {
      window[varName] = Array.from(new Set(window[varName]));
    });
  }

  if (name === 'no-russia') {
    resetCountries();
    for (var i = 0; i < countriesDB.length; i++) {
      if ((countriesDB[i].country_code || '').toUpperCase() === 'RU') { ribbonState[i] = 'excl'; break; }
    }
    resetCats();
    setPresetDefaults();
  } else if (name === 'africa')   { safeSetCodes('AFRICAN_CODES');
  } else if (name === 'americas') { safeSetCodes('AMERICAS_CODES');
  } else if (name === 'asia')     { safeSetCodes('ASIAN_CODES');
  } else if (name === 'europe')   { safeSetCodes('EUROPEAN_CODES');
  } else if (name === 'oceania')  { safeSetCodes('OCEANIA_CODES');
  } else if (name === 'top100pib'){ safeSetCodes('TOP100_PIB_CODES');
  } else if (name === 'small')    { safeSetCodes('SMALL_COUNTRIES_CODES');
  } else if (name === 'france-neighbors') { safeSetCodes('FRANCE_NEIGHBORS_CODES');
  } else if (name === 'landlocked') { safeSetCodes('LANDLOCKED_CODES');
  } else if (name === 'islands')    { safeSetCodes('ISLANDS_CODES');

  } else if (name === 'flag-guesser') {
    resetCountries(); resetCats();
    // 10 tours
    document.getElementById('custom-n-slider').value = 10;
    ribbonOnSliderChange(10);
    // 60 secondes (index 6)
    document.getElementById('time-slider').value = 6; selectTimeSlider(6);
    // Mode Hardcore (drapeau seul, pas de nom)
    selectSubModePill('hardcore');
    // Ordre : pays d'abord
    selectDraftPill('countries');

  } else if (name === 'sport') {
    resetCountries();
    for (var i = 0; i < ALL_CATEGORIES.length; i++) {
      catRibbonState[i] = (SPORT_CAT_IDS.indexOf(ALL_CATEGORIES[i].id) !== -1) ? 'incl' : 'excl';
    }
    catRibbonSelected = {};
    setPresetDefaults();

  } else if (name === 'chill') {
    resetCountries(); resetCats();
    document.getElementById('custom-n-slider').value = 8;
    document.getElementById('custom-n-display').textContent = 8;
    document.getElementById('time-slider').value = 7; selectTimeSlider(7); // ∞
    selectSubModePill('normal');
    selectDraftPill('auto');

  } else if (name === 'ultra') {
    resetCountries(); resetCats();
    // 16 tours
    document.getElementById('custom-n-slider').value = 16;
    ribbonOnSliderChange(16);
    // 1 seconde (index 0)
    document.getElementById('time-slider').value = 0; selectTimeSlider(0);
    // Hardcore
    selectSubModePill('hardcore');
    // Ordre par pays
    selectDraftPill('countries');
  }

  // Re-render
  ribbonRender();
  catRibbonRender();
  ribbonUpdateSlots();
  catRibbonUpdateSlots();

  // Highlight actif
  document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

function setPresetDefaults() {
  document.getElementById('custom-n-slider').value = 8;
  ribbonOnSliderChange(8);
  document.getElementById('time-slider').value = 4; selectTimeSlider(4); // 20s
  selectSubModePill('normal');
  selectDraftPill('auto');
}

