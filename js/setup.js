// ─── CUSTOM MODE ──────────────────────────────────────────────────────────────
var customTimeSelected = 20;
var customSubMode = 'normal'; // 'normal' | 'hardcore' | 'reverse'

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

  if (name === 'no-russia') {
    resetCountries();
    for (var i = 0; i < countriesDB.length; i++) {
      if ((countriesDB[i].country_code || '').toUpperCase() === 'RU') { ribbonState[i] = 'excl'; break; }
    }
    resetCats();
    setPresetDefaults();

  } else if (name === 'europe')   { setCountryByList(EUROPEAN_CODES);  resetCats(); setPresetDefaults();
  } else if (name === 'africa')   { setCountryByList(AFRICAN_CODES);   resetCats(); setPresetDefaults();
  } else if (name === 'americas') { setCountryByList(AMERICAS_CODES);  resetCats(); setPresetDefaults();
  } else if (name === 'asia')     { setCountryByList(ASIAN_CODES);     resetCats(); setPresetDefaults();
  } else if (name === 'oceania')  { setCountryByList(OCEANIA_CODES);   resetCats(); setPresetDefaults();
  } else if (name === 'top100pib'){ setCountryByList(TOP100_PIB_CODES);resetCats(); setPresetDefaults();
  } else if (name === 'small')    { setCountryByList(SMALL_COUNTRIES_CODES); resetCats(); setPresetDefaults();
  } else if (name === 'france-neighbors') { setCountryByList(FRANCE_NEIGHBORS_CODES); resetCats(); setPresetDefaults();
  } else if (name === 'landlocked') { setCountryByList(LANDLOCKED_CODES); resetCats(); setPresetDefaults();
  } else if (name === 'islands')    { setCountryByList(ISLANDS_CODES);    resetCats(); setPresetDefaults();

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
      catRibbonState[i] = (SPORT_CAT_IDS.indexOf(ALL_CATEGORIES[i].id) !== -1) ? 'incl' : 'poss';
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

