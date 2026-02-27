function generateSeedCatsFirst() {
  var cp = getCatRibbonPool();
  var forcedCatIdxs   = cp.included.slice();
  var possibleCatIdxs = cp.possible;
  var nCatRandom = Math.max(0, N_TURNS - forcedCatIdxs.length);
  var catPool = shuffle(forcedCatIdxs.concat(shuffle(possibleCatIdxs).slice(0, nCatRandom * 2))).slice(0, N_TURNS);
  if (catPool.length < N_TURNS) {
    var allCi = ALL_CATEGORIES.map(function(_,i){return i;});
    catPool = catPool.concat(shuffle(allCi.filter(function(i){return catPool.indexOf(i)===-1;}))).slice(0, N_TURNS);
  }
  var catIds = catPool.map(function(i){return ALL_CATEGORIES[i].id;});
  var pool = getRibbonCountryPool();
  var forcedIdxs = pool.included.slice();
  var available  = pool.possible;
  var nRandom = Math.max(0, N_TURNS - forcedIdxs.length);
  var eligible = available.filter(function(i){ return catIds.every(function(id){
    var v = countriesDB[i][id]; return v !== false && v !== null && v !== undefined;
  });});
  var randomPool;
  if (eligible.length >= nRandom) {
    randomPool = shuffle(eligible).slice(0, nRandom);
  } else {
    var scored = available.map(function(i){
      return {i:i, score:catIds.filter(function(id){var v=countriesDB[i][id];return v!==false&&v!==null&&v!==undefined;}).length};
    }).sort(function(a,b){return b.score-a.score;});
    randomPool = shuffle(scored.slice(0, Math.min(nRandom*2+4, scored.length))).slice(0, nRandom).map(function(x){return x.i;});
  }
  var validForced = forcedIdxs.filter(function(i){
    return catIds.every(function(id){var v=countriesDB[i][id];return v!==false&&v!==null&&v!==undefined;});
  });
  var shortage = forcedIdxs.length - validForced.length;
  var extra = shortage > 0 ? shuffle(eligible.filter(function(i){return validForced.indexOf(i)===-1;})).slice(0,shortage) : [];
  var finalIdxs = shuffle(validForced.concat(extra).concat(randomPool)).slice(0, N_TURNS);
  lastDraftUsed = 'cats';
  return encodeSeed(finalIdxs, catPool, _currentGameMode(), TIME_PER_TURN);
}

function generateSeedCountriesFirst() {
  var pool = getRibbonCountryPool();
  var forcedIdxs = pool.included.slice();
  var available  = shuffle(pool.possible);
  var nRandom    = Math.max(0, N_TURNS - forcedIdxs.length);
  var finalIdxs  = forcedIdxs.concat(available.slice(0, nRandom)).slice(0, N_TURNS);
  var chosenCountries = finalIdxs.map(function(i){ return {c: countriesDB[i], i: i}; });
  var cp = getCatRibbonPool();
  var forcedCatIdxs   = cp.included.slice();
  var possibleCatIdxs = cp.possible;
  var validPossible = possibleCatIdxs.map(function(i){return {cat:ALL_CATEGORIES[i],i:i};}).filter(function(x){
    return chosenCountries.every(function(co){var v=co.c[x.cat.id];return v!==false&&v!==null&&v!==undefined;});
  });
  var validForced = forcedCatIdxs.filter(function(i){
    return chosenCountries.every(function(co){var v=co.c[ALL_CATEGORIES[i].id];return v!==false&&v!==null&&v!==undefined;});
  });
  var nCatRandom = Math.max(0, N_TURNS - validForced.length);
  if (validForced.length + validPossible.length >= N_TURNS) {
    var catPool = validForced.concat(shuffle(validPossible).slice(0, nCatRandom).map(function(x){return x.i;}));
    lastDraftUsed = 'countries';
    return encodeSeed(finalIdxs, catPool, _currentGameMode(), TIME_PER_TURN);
  }
  var allCatIds2 = ALL_CATEGORIES.map(function(c){return c.id;});
  var relaxPool = shuffle(available.map(function(i){
    return {i:i, score:allCatIds2.filter(function(id){var v=countriesDB[i][id];return v!==false&&v!==null&&v!==undefined;}).length};
  }).sort(function(a,b){return b.score-a.score;}).slice(0, Math.min(N_TURNS*4, available.length)));
  var relaxIdxs = forcedIdxs.concat(relaxPool.slice(0,nRandom).map(function(x){return x.i;})).slice(0,N_TURNS);
  var relaxCountries = relaxIdxs.map(function(i){return {c:countriesDB[i],i:i};});
  var relaxValidPoss = possibleCatIdxs.map(function(i){return {cat:ALL_CATEGORIES[i],i:i};}).filter(function(x){
    return relaxCountries.every(function(co){var v=co.c[x.cat.id];return v!==false&&v!==null&&v!==undefined;});
  });
  var relaxValidForced = forcedCatIdxs.filter(function(i){
    return relaxCountries.every(function(co){var v=co.c[ALL_CATEGORIES[i].id];return v!==false&&v!==null&&v!==undefined;});
  });
  if (relaxValidForced.length + relaxValidPoss.length >= N_TURNS) {
    var nRCatRand = Math.max(0, N_TURNS - relaxValidForced.length);
    var catPool2 = relaxValidForced.concat(shuffle(relaxValidPoss).slice(0, nRCatRand).map(function(x){return x.i;}));
    lastDraftUsed = 'countries';
    return encodeSeed(relaxIdxs, catPool2, _currentGameMode(), TIME_PER_TURN);
  }
  return generateSeedCatsFirst();
}

function generateSeed() {
  var useCats;
  if (draftMode === 'cats')           { useCats = true; }
  else if (draftMode === 'countries') { useCats = false; }
  else                                { useCats = (draftCounter % 2 === 0); }
  draftCounter++;
  return useCats ? generateSeedCatsFirst() : generateSeedCountriesFirst();
}

function applyGameFromSeed(str) {
  var decoded = decodeSeed(str);
  if (!decoded) { alert(t('invalidSeed')); return false; }
  var ci = decoded.countryIndices, ki = decoded.catIndices;
  if (ci.some(function(i){return i<0||i>=countriesDB.length;}))  { alert(t('invalidSeedIdx')); return false; }
  if (ki.some(function(i){return i<0||i>=ALL_CATEGORIES.length;})) { alert(t('invalidSeedIdx')); return false; }
  gameCountries  = ci.map(function(i){return countriesDB[i];});
  gameCategories = ki.map(function(i){return ALL_CATEGORIES[i];});
  currentSeed    = str;
  if (!decoded.legacy) {
    var m = decoded.mode;
    document.body.classList.remove('hardcore','reverse-mode');
    if (m === 'hardcore') {
      document.body.classList.add('hardcore');
      if (gameMode === 'custom') customSubMode = 'hardcore'; else gameMode = 'hardcore';
    } else if (m === 'reverse') {
      document.body.classList.add('reverse-mode');
      reverseAssignments = {};
      if (gameMode === 'custom') customSubMode = 'reverse'; else gameMode = 'reverse';
    } else {
      if (gameMode === 'custom') customSubMode = 'normal';
    }
    TIME_PER_TURN = decoded.timeSecs;
  }
  return true;
}



// ─── RIBBON-AWARE SEED GENERATION ────────────────────────────────────────────
// Returns a pool of countriesDB indices filtered according to ribbon state
function getRibbonCountryPool() {
  var included = [], possible = [];
  // If ribbon never initialized (normal game), all countries are possible
  if (Object.keys(ribbonState).length === 0) {
    for (var i = 0; i < countriesDB.length; i++) possible.push(i);
    return { included: included, possible: possible };
  }
  for (var i = 0; i < countriesDB.length; i++) {
    if (ribbonState[i] === 'incl') included.push(i);
    else if (ribbonState[i] === 'poss') possible.push(i);
    // 'excl' → ignored
  }
  // Safety: if possible+included is too small, open all
  if (included.length + possible.length < 2) {
    for (var i = 0; i < countriesDB.length; i++) possible.push(i);
  }
  return { included: included, possible: possible };
}

