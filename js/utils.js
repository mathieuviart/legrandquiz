// ─── SEED ─────────────────────────────────────────────────────────────────────
function shuffle(arr) { return arr.slice().sort(function() { return Math.random() - 0.5; }); }

// ─── SEED ENGINE v2 ───────────────────────────────────────────────────────────
// Format interne (avant encodage) :
//   [version:1][mode:1][time:2][n:1][countries:n*2][cats:n*2][checksum:2]
//   mode : 0=normal 1=hardcore 2=reverse
//   time : secondes (0=infini)
//   Encodage : Base62 → chaîne opaque, non-lisible, non-modifiable à la main

var SEED_VERSION = 2;
var BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function bytesToBase62(bytes) {
  var digits = [0];
  for (var b = 0; b < bytes.length; b++) {
    var carry = bytes[b];
    for (var d = 0; d < digits.length; d++) {
      carry += digits[d] * 256;
      digits[d] = carry % 62;
      carry = Math.floor(carry / 62);
    }
    while (carry > 0) { digits.push(carry % 62); carry = Math.floor(carry / 62); }
  }
  var result = '';
  for (var d = digits.length - 1; d >= 0; d--) result += BASE62[digits[d]];
  return result || '0';
}

function base62ToBytes(str, expectedLen) {
  var digits = [];
  for (var i = 0; i < str.length; i++) {
    var v = BASE62.indexOf(str[i]);
    if (v < 0) return null;
    digits.push(v);
  }
  var bytes = [0];
  for (var d = 0; d < digits.length; d++) {
    var carry = digits[d];
    for (var b = 0; b < bytes.length; b++) {
      carry += bytes[b] * 62;
      bytes[b] = carry & 0xFF;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xFF); carry >>= 8; }
  }
  bytes.reverse();
  while (bytes.length < expectedLen) bytes.unshift(0);
  if (bytes.length > expectedLen) bytes = bytes.slice(bytes.length - expectedLen);
  return bytes;
}

function encodeSeed(countryIdxs, catIdxs, mode, timeSecs) {
  var modeCode = (mode === 'hardcore') ? 1 : (mode === 'reverse') ? 2 : 0;
  var time = (timeSecs === undefined || timeSecs === null) ? 20 : timeSecs;
  var n = countryIdxs.length;
  var bytes = [];
  bytes.push(SEED_VERSION);
  bytes.push(modeCode);
  bytes.push(time & 0xFF);
  bytes.push((time >> 8) & 0xFF);
  bytes.push(n);
  for (var i = 0; i < n; i++) { bytes.push(countryIdxs[i] & 0xFF); bytes.push((countryIdxs[i] >> 8) & 0xFF); }
  for (var i = 0; i < n; i++) { bytes.push(catIdxs[i] & 0xFF); bytes.push((catIdxs[i] >> 8) & 0xFF); }
  var checksum = 0;
  for (var b = 0; b < bytes.length; b++) checksum = (checksum + bytes[b]) & 0xFFFF;
  bytes.push(checksum & 0xFF);
  bytes.push((checksum >> 8) & 0xFF);
  return bytesToBase62(bytes);
}

function decodeSeed(str) {
  // Remember: this helper only converts the opaque base62 string back into
  // numeric fields. it does **not** know anything about the current
  // countriesDB/ALL_CATEGORIES arrays, so it cannot verify that the indices it
  // returns are in-bounds. callers (e.g. applyGameFromSeed) must perform a
  // separate sanity check before using the results.
  if (!str || typeof str !== 'string') return null;
  str = str.trim();

  // Rétrocompatibilité ancien format "12-45_0-5"
  if (/^\d[\d-]*_[\d-]*\d$/.test(str)) {
    var parts = str.split('_');
    if (parts.length !== 2) return null;
    var ci = parts[0].split('-').map(Number);
    var ki = parts[1].split('-').map(Number);
    if (ci.length !== ki.length || ci.length < 2) return null;
    if (ci.some(isNaN) || ki.some(isNaN)) return null;
    return { countryIndices: ci, catIndices: ki, mode: 'normal', timeSecs: 20, legacy: true };
  }

  // Format v2 Base62 — taille header = 5 + n*4 + 2
  // On essaie n=2..16 jusqu'à trouver un checksum valide
  for (var n = 2; n <= 16; n++) {
    var expectedLen = 5 + n * 4 + 2;
    var bytes = base62ToBytes(str, expectedLen);
    if (!bytes || bytes.length !== expectedLen) continue;
    if (bytes[0] !== SEED_VERSION) continue;
    if (bytes[4] !== n) continue;
    var checksumStored = bytes[expectedLen - 2] + (bytes[expectedLen - 1] << 8);
    var checksumCalc = 0;
    for (var b = 0; b < expectedLen - 2; b++) checksumCalc = (checksumCalc + bytes[b]) & 0xFFFF;
    if (checksumStored !== checksumCalc) continue;
    var modeCode = bytes[1];
    var timeSecs = bytes[2] + (bytes[3] << 8);
    var ci = [], ki = [], offset = 5;
    for (var i = 0; i < n; i++) { ci.push(bytes[offset] + (bytes[offset+1] << 8)); offset += 2; }
    for (var i = 0; i < n; i++) { ki.push(bytes[offset] + (bytes[offset+1] << 8)); offset += 2; }
    var mode = modeCode === 1 ? 'hardcore' : modeCode === 2 ? 'reverse' : 'normal';
    return { countryIndices: ci, catIndices: ki, mode: mode, timeSecs: timeSecs, legacy: false };
  }
  return null;
}

function _currentGameMode() {
  if (gameMode === 'custom') return customSubMode || 'normal';
  return gameMode;
}
