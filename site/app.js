/* JetDesk.AI */
(function () {
'use strict';

/* ---------- data ---------- */
var AP = [];
try { AP = JSON.parse(document.getElementById('apdata').textContent); } catch (e) { AP = []; }
var BY = {};                       // code -> airport
AP.forEach(function (a) {
  BY[a.c] = a;
  if (a.f && !BY[a.f]) BY[a.f] = a;
});

function lookup(q) {
  if (!q) return null;
  q = q.trim().toUpperCase();
  return BY[q] || BY['K' + q] || null;
}

/* ---------- state ---------- */
var SKEY = 'mfd1';
var DEF = {
  settings: { ktas: 260, gph: 40, taxiGal: 5, blockOverheadMin: 12, stopGal: 15,
              groundStopMin: 25, price: 7.25, homeBase: 'KPVD', tail: '', theme: 'auto', crzAlt: 26000,
              acType: 'Piper Meridian', toSL: 2438, ldgSL: 2110 },
  profiles: [],
  activeProfile: 0,
  trips: [],
  activeTrip: null,
  fuelLog: {},
  notes: {},
  fs: { aptA: 'KHPN', aptB: 'KBDR', priceA: '', priceB: '', gal: 120, detour: 15, ramp: 0 },
  q: [],
  fbos: {},
  browse: false
};
var S;
function loadS() {
  try {
    var raw = localStorage.getItem(SKEY);
    if (raw) { S = JSON.parse(raw); }
  } catch (e) { S = null; }
  if (!S || !S.settings) S = JSON.parse(JSON.stringify(DEF));
  // fill any missing keys from defaults
  Object.keys(DEF.settings).forEach(function (k) {
    if (S.settings[k] === undefined) S.settings[k] = DEF.settings[k];
  });
  ensureProfiles();
  ['trips', 'fuelLog', 'notes', 'fs', 'q', 'fbos'].forEach(function (k) {
    if (S[k] === undefined) S[k] = JSON.parse(JSON.stringify(DEF[k]));
  });
  if (S.activeTrip === undefined) S.activeTrip = S.trips.length ? S.trips[0].id : null;
}
/* ---------- aircraft presets and profiles ----------
   Book numbers are published sea-level, ISA, max-weight, 50 ft obstacle figures rounded for planning.
   They are starting points; the POH for the specific serial number wins. */
var PRESETS = [
  { name: 'Piper Meridian', ktas: 260, gph: 40, crzAlt: 26000, toSL: 2438, ldgSL: 2110, stopGal: 15 },
  { name: 'Piper M600', ktas: 274, gph: 41, crzAlt: 28000, toSL: 2635, ldgSL: 2659, stopGal: 15 },
  { name: 'Pilatus PC-12', ktas: 285, gph: 60, crzAlt: 28000, toSL: 2485, ldgSL: 2170, stopGal: 20 },
  { name: 'TBM 960', ktas: 320, gph: 57, crzAlt: 30000, toSL: 2535, ldgSL: 2430, stopGal: 20 },
  { name: 'King Air 350i', ktas: 312, gph: 100, crzAlt: 30000, toSL: 3300, ldgSL: 2692, stopGal: 35 },
  { name: 'Citation M2', ktas: 400, gph: 130, crzAlt: 41000, toSL: 3210, ldgSL: 2590, stopGal: 45 },
  { name: 'Citation CJ3+', ktas: 416, gph: 150, crzAlt: 45000, toSL: 3180, ldgSL: 2770, stopGal: 50 },
  { name: 'Phenom 100EV', ktas: 405, gph: 130, crzAlt: 41000, toSL: 3190, ldgSL: 2430, stopGal: 45 },
  { name: 'Phenom 300E', ktas: 453, gph: 180, crzAlt: 45000, toSL: 3209, ldgSL: 2212, stopGal: 60 },
];
var PROFILE_KEYS = ['acType', 'tail', 'ktas', 'gph', 'crzAlt', 'taxiGal', 'blockOverheadMin', 'stopGal', 'groundStopMin', 'toSL', 'ldgSL'];
function profileFromSettings() {
  var o = {}; PROFILE_KEYS.forEach(function (k) { o[k] = S.settings[k]; }); return o;
}
function ensureProfiles() {
  if (!S.profiles || !S.profiles.length) { S.profiles = [profileFromSettings()]; S.activeProfile = 0; }
  if (S.activeProfile == null || S.activeProfile >= S.profiles.length) S.activeProfile = 0;
}
function saveActiveProfile() {
  ensureProfiles();
  S.profiles[S.activeProfile] = profileFromSettings();
}
function useProfile(i) {
  ensureProfiles();
  saveActiveProfile();
  if (i < 0 || i >= S.profiles.length) return;
  S.activeProfile = i;
  var p = S.profiles[i];
  PROFILE_KEYS.forEach(function (k) { if (p[k] !== undefined) S.settings[k] = p[k]; });
  save();
}
function applyPreset(name) {
  var p = null; PRESETS.forEach(function (x) { if (x.name === name) p = x; });
  if (!p) return;
  S.settings.acType = p.name; S.settings.ktas = p.ktas; S.settings.gph = p.gph; S.settings.crzAlt = p.crzAlt;
  S.settings.toSL = p.toSL; S.settings.ldgSL = p.ldgSL; S.settings.stopGal = p.stopGal;
  saveActiveProfile(); save();
}
function profileLabel(p) { return (p.tail ? p.tail + ' · ' : '') + (p.acType || 'Airplane'); }

function save() {
  try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* in-memory only */ }
}
loadS();

/* ---------- helpers ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); }
function localId(prefix) {
  var bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return (prefix || '') + Date.now().toString(36) + Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function fmtNm(nm) { return nm < 100 ? nm.toFixed(1) : Math.round(nm).toLocaleString('en-US'); }
function fmtMin(min) {
  min = Math.round(min);
  if (min < 60) return min + ' min';
  var h = Math.floor(min / 60), m = min % 60;
  return h + ' h ' + (m < 10 ? '0' : '') + m + ' m';
}
function fmtMoney(x, cents) {
  var neg = x < 0; x = Math.abs(x);
  var s = cents ? x.toFixed(2) : Math.round(x).toLocaleString('en-US');
  return (neg ? '-$' : '$') + s;
}
function fmtNum(x) { return Math.round(x).toLocaleString('en-US'); }
function today() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function daysSince(iso) {
  var t = Date.parse(iso + 'T12:00:00');
  if (!isFinite(t)) return 999;
  return Math.max(0, Math.round((Date.now() - t) / 86400000));
}
function hav(a, b) { // nm between airports
  var R = 3440.065, r = Math.PI / 180;
  var dLa = (b.la - a.la) * r, dLo = (b.lo - a.lo) * r;
  var x = Math.sin(dLa / 2), y = Math.sin(dLo / 2);
  var h = x * x + Math.cos(a.la * r) * Math.cos(b.la * r) * y * y;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* runway verdict: 0 good / 1 warn / 2 bad */
function rTier(r) {
  if (r.l >= 5000 && r.w >= 100) return 0;
  if (r.l >= 4000 && r.w >= 75) return 1;
  return 2;
}
var TIER = [
  { cls: 'good', word: 'WIDE OPEN' },
  { cls: 'warn', word: 'WORKABLE' },
  { cls: 'bad',  word: 'TIGHT' }
];
function aptTier(a) {
  var t = 2;
  (a.r || []).forEach(function (r) { t = Math.min(t, rTier(r)); });
  return t;
}
function bestRw(a) {
  var b = null;
  (a.r || []).forEach(function (r) { if (!b || rTier(r) < rTier(b) || (rTier(r) === rTier(b) && r.l > b.l)) b = r; });
  return b;
}
function faaOf(a) { return a.f || (a.c.length === 4 && a.c[0] === 'K' ? a.c.slice(1) : a.c); }
function hasJetA(a) {
  if (!a.fu) return false;
  return a.fu.split(',').some(function (t) {
    var c = t.trim().charAt(0);
    return c === 'A' || c === 'B';
  });
}
var MXWORD = { M: ['major on field', 'good'], m: ['minor only', 'warn'], '-': ['none on field', 'bad'] };
function linkRow(a) {
  var faa = faaOf(a);
  return '<div class="btnrow" style="margin-top:10px">' +
    '<a class="lbtn" target="_blank" rel="noopener" href="https://www.airnav.com/airport/' + esc(a.c) + '">Fuel $ · AirNav</a>' +
    '<a class="lbtn" target="_blank" rel="noopener" href="https://aviationweather.gov/data/metar/?id=' + esc(a.c) + '&taf=1">METAR / TAF</a>' +
    '<a class="lbtn" target="_blank" rel="noopener" href="https://skyvector.com/airport/' + esc(faa) + '">Chart</a>' +
    '<a class="lbtn" href="foreflightmobile://maps/search?q=' + esc(a.c) + '">ForeFlight</a>' +
    '</div>';
}
function bearing(a, b) {
  var r = Math.PI / 180;
  var y = Math.sin((b.lo - a.lo) * r) * Math.cos(b.la * r);
  var x = Math.cos(a.la * r) * Math.sin(b.la * r) -
          Math.sin(a.la * r) * Math.cos(b.la * r) * Math.cos((b.lo - a.lo) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function legCalc(fromA, toA) {
  var st = S.settings;
  var d = hav(fromA, toA);
  var wind = legWind(fromA, toA);
  var spd = wind ? wind.gs : Math.max(60, st.ktas);
  var block = d / Math.max(40, spd) * 60 + num(st.blockOverheadMin, 12);
  var burn = block / 60 * num(st.gph, 40) + num(st.taxiGal, 5);
  return { d: d, block: block, burn: burn, cost: burn * num(st.price, 0), wind: wind };
}

/* ---------- location / near me ---------- */
var GEO = { mode: false, filter: 'all', busy: false };
function fixFresh(maxMin) {
  var f = S.lastFix;
  return (f && isFinite(f.la) && Date.now() - f.at < maxMin * 60 * 1000) ? f : null;
}
function fixAgeMin() { return S.lastFix ? Math.round((Date.now() - S.lastFix.at) / 60000) : null; }
function geoLocate() {
  return new Promise(function (resolve) {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        S.lastFix = { la: pos.coords.latitude, lo: pos.coords.longitude, at: Date.now() };
        save();
        resolve(S.lastFix);
      },
      function () { resolve(fixFresh(30)); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  });
}
function nearestList(fix, filter, n) {
  var out = [];
  for (var i = 0; i < AP.length; i++) {
    var a = AP[i];
    if (filter === 'jet' && !hasJetA(a)) continue;
    if (filter === 'big' && aptTier(a) !== 0) continue;
    out.push([hav(fix, a), a]);
  }
  out.sort(function (x, y) { return x[0] - y[0]; });
  return out.slice(0, n || 15);
}
function nearestCode(fix) {
  var l = nearestList(fix, 'all', 1);
  return l.length ? l[0][1].c : null;
}
function renderNear() {
  var fix = fixFresh(30);
  var st = $('nearStatus');
  $('nearFilters').style.display = GEO.mode ? 'flex' : 'none';
  if (!GEO.mode) { if (st) st.textContent = ''; return; }
  if (!fix) { st.textContent = 'No location fix. Tap the locate button again, and check location permission for this app.'; $('aptResults').innerHTML = ''; return; }
  var age = fixAgeMin();
  st.textContent = 'Around your position' + (age > 2 ? ' (fix ' + age + ' min old)' : '') +
    (GEO.filter === 'jet' ? ' · fields with Jet A' : (GEO.filter === 'big' ? ' · 5,000 x 100 ft or better' : ''));
  var list = nearestList(fix, GEO.filter, 15);
  $('aptResults').innerHTML = list.map(function (p, idx) {
    var d = p[0], a = p[1];
    var br = bestRw(a), tier = br ? rTier(br) : 2;
    var brg = Math.round(bearing({ la: fix.la, lo: fix.lo }, a)) || 360;
    var here = idx === 0 && d < 3;
    return '<button class="result" data-apt="' + esc(a.c) + '">' +
      '<span class="dot ' + TIER[tier].cls + '"></span>' +
      '<span class="code">' + esc(a.c) + '</span>' +
      '<span class="nm"><span class="n1">' + esc(a.n) + '</span>' +
        '<span class="n2">' + (here ? '<span class="pill acc">You are here</span> ' : '') + esc((a.m || '') + ', ' + a.st) +
        (br ? ' · ' + fmtNum(br.l) + '&times;' + fmtNum(br.w) : '') +
        (a.fu && !hasJetA(a) ? ' · <span style="color:var(--bad)">no Jet A</span>' : '') +
        ' <span class="wxmini" data-nwx="' + esc(a.c) + '" style="margin:0"></span></span></span>' +
      '<span class="rw">' + fmtNm(d) + ' nm<br>brg ' + ('00' + brg).slice(-3) + '&deg;T</span>' +
    '</button>';
  }).join('');
  var codes = [];
  list.slice(0, 8).forEach(function (p) { codes.push(p[1].c); });
  wxFetch(codes).then(function (map) {
    if (!map || !GEO.mode) return;
    document.querySelectorAll('[data-nwx]').forEach(function (s) {
      var d2 = map[s.dataset.nwx];
      if (!d2 || !d2.metar) return;
      var cat = wxCat(d2.metar);
      s.innerHTML = '<span class="pill ' + cat.cls + '">' + cat.k + '</span>';
    });
  });
}

/* ---------- accounts + cloud sync (/api/me, /api/data) ---------- */
var BRAND = 'JetDesk';
var AUTH = { tok: null, me: null, loading: false };
try { AUTH.tok = localStorage.getItem('jd_tok'); } catch (e) {}
function setTok(t) {
  AUTH.tok = t;
  try { if (t) localStorage.setItem('jd_tok', t); else localStorage.removeItem('jd_tok'); } catch (e) {}
}
function loggedIn() { return !!(AUTH.tok && AUTH.me); }
function isProUser() { return !!(AUTH.me && AUTH.me.pro); }
function canEdit() { return !(loggedIn() && AUTH.me.op && AUTH.me.op.can_edit === false); }
function api(path, opts) {
  opts = opts || {};
  var h = Object.assign({}, opts.headers || {});
  if (AUTH.tok) h.authorization = 'Bearer ' + AUTH.tok;
  var body = opts.body;
  if (body && typeof body !== 'string') { h['content-type'] = 'application/json'; body = JSON.stringify(body); }
  return fetch(path, { method: opts.method || (body ? 'POST' : 'GET'), headers: h, body: body })
    .then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && AUTH.tok && path.indexOf('/api/auth/') === -1) {
          setTok(null); AUTH.me = null; RP.configured = false; renderGate();
        }
        if (r.status === 403 && j && j.code === 'verify') promptVerify(j.error);
        return { ok: r.ok, status: r.status, data: j };
      });
    })
    .catch(function () { return { ok: false, status: 0, data: {} }; });
}
function applyProfile() {
  if (!AUTH.me || !AUTH.me.user) return;
  var u = AUTH.me.user;
  if (u.tail && !S.settings.tail) S.settings.tail = u.tail;
  if (u.home_base && (!S.settings.homeBase || S.settings.homeBase === 'KPVD')) S.settings.homeBase = u.home_base;
  save(); renderSub();
}
function loadMe() {
  if (!AUTH.tok || !wxAvailable()) return Promise.resolve(null);
  return api('/api/me').then(function (r) {
    if (r.ok) { AUTH.me = r.data; applyProfile(); return r.data; }
    return null;
  });
}

var RP = { configured: null, at: 0, ttl: 60 * 1000, flushing: false, proNeeded: false };
function pricesFetch(force) {
  if (!wxAvailable() || !loggedIn()) { RP.configured = false; return Promise.resolve(false); }
  if (!force && RP.configured !== null && Date.now() - RP.at < RP.ttl) return Promise.resolve(RP.configured);
  return api('/api/data').then(function (r) {
    if (!r.ok) { if (r.status === 401) RP.configured = false; return null; }
    RP.configured = true; RP.at = Date.now();
    mergeShared(r.data);
    return true;
  });
}
function mergeShared(remoteFull) {
  if (!remoteFull) return;
  [['fuelLog', 'prices'], ['fbos', 'fbos']].forEach(function (pair) {
    var localKey = pair[0], remote = remoteFull[pair[1]];
    if (!remote || typeof remote !== 'object') return;
    var pend = {};
    Object.keys(S[localKey] || {}).forEach(function (c) {
      var p = (S[localKey][c] || []).filter(function (e) { return e.pending; });
      if (p.length) pend[c] = p;
    });
    S[localKey] = {};
    Object.keys(remote).forEach(function (c) { S[localKey][c] = remote[c].slice(); });
    Object.keys(pend).forEach(function (c) { S[localKey][c] = (S[localKey][c] || []).concat(pend[c]); });
  });
  /* trips: the cloud copy wins once it has anything; otherwise push what this phone has */
  if (Array.isArray(remoteFull.trips)) {
    var hasPendingTrips = S.q.some(function (o) { return o.op === 'trips_set'; });
    if (remoteFull.trips.length && !hasPendingTrips) {
      S.trips = remoteFull.trips;
      if (!S.trips.some(function (t) { return t.id === S.activeTrip; })) S.activeTrip = S.trips.length ? S.trips[0].id : null;
    } else if (!remoteFull.trips.length && S.trips.length && !hasPendingTrips) {
      queueTrips();
    }
  }
  if (remoteFull.notes && typeof remoteFull.notes === 'object') {
    var localNotes = S.notes || {};
    Object.keys(localNotes).forEach(function (c) {
      if (localNotes[c] && !remoteFull.notes[c] && !S.q.some(function (o) { return o.op === 'note_set' && o.code === c; })) {
        S.q.push({ op: 'note_set', code: c, text: localNotes[c] });
      }
    });
    S.notes = Object.assign({}, localNotes, remoteFull.notes);
  }
  save();
}
var tripsT;
function queueTrips() {
  S.q = S.q.filter(function (o) { return o.op !== 'trips_set'; });
  S.q.push({ op: 'trips_set', trips: S.trips });
  save();
  clearTimeout(tripsT);
  tripsT = setTimeout(function () { flushQ(); }, 800);
}
function queueNote(code, text) {
  S.q = S.q.filter(function (o) { return !(o.op === 'note_set' && o.code === code); });
  S.q.push({ op: 'note_set', code: code, text: text });
  save();
  clearTimeout(tripsT);
  tripsT = setTimeout(function () { flushQ(); }, 800);
}
function flushQ(done) {
  if (RP.flushing || !S.q.length || !loggedIn() || !wxAvailable()) { if (done) done(false); return; }
  RP.flushing = true;
  var finish = function (ok) { RP.flushing = false; if (done) done(ok); };
  var step = function () {
    if (!S.q.length) { finish(true); return; }
    var op = S.q[0];
    var body = {};
    Object.keys(op).forEach(function (k) { if (k !== 'lid') body[k] = op[k]; });
    api('/api/data', { body: body }).then(function (r) {
      if (r.status === 402) { S.q.shift(); RP.proNeeded = true; save(); showToast(r.data.error || 'That needs Pro.'); step(); return; }
      if (r.status === 401) { finish(false); return; }
      if (!r.ok) { finish(false); return; }
      if (op.lid) {
        var lk = op.op.indexOf('fbo') === 0 ? 'fbos' : 'fuelLog';
        var l = S[lk][op.code] || [];
        S[lk][op.code] = l.filter(function (e) { return e.id !== op.lid; });
      }
      S.q.shift();
      mergeShared(r.data);
      save();
      step();
    });
  };
  step();
}

/* ---------- toast + modal ---------- */
var toastT;
function showToast(msg) {
  var t = $('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast'; t.className = 'toast';
    t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
}
var dialogReturnFocus = null;
function setPageInert(on) {
  document.querySelectorAll('header.app,#appMain,nav.tabs,footer.disc').forEach(function (el) { el.inert = on; });
  document.body.classList.toggle('modal-open', on);
}
function openModal(html) {
  if (!$('modalWrap').classList.contains('on')) dialogReturnFocus = document.activeElement;
  $('modalBody').innerHTML = '<div class="grab"></div>' + html;
  $('modalWrap').classList.add('on');
  $('modalWrap').setAttribute('aria-hidden', 'false');
  setPageInert(true);
  setTimeout(function () {
    var f = $('modalBody').querySelector('input,select,textarea,button,[href],[tabindex]:not([tabindex="-1"])');
    if (f) f.focus();
  }, 0);
}
function closeModal() {
  $('modalWrap').classList.remove('on');
  $('modalWrap').setAttribute('aria-hidden', 'true');
  setPageInert(false);
  if (dialogReturnFocus && dialogReturnFocus.isConnected) dialogReturnFocus.focus();
  dialogReturnFocus = null;
}

/* ---------- market reference (/api/market) ---------- */
var MK = { data: null, at: 0, ttl: 15 * 60 * 1000 };
function marketFetch() {
  if (!wxAvailable()) return Promise.resolve(null);
  if (MK.data && Date.now() - MK.at < MK.ttl) return Promise.resolve(MK.data);
  return fetch('/api/market')
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { MK.data = d; MK.at = Date.now(); return d; })
    .catch(function () { return null; });
}
function deltaChip(delta, unit, label) {
  if (delta == null || !isFinite(delta)) return '';
  var up = delta > 0.001, dn = delta < -0.001;
  var cls = up ? 'bad' : (dn ? 'good' : 'dim');
  var arrow = up ? '&#9650;' : (dn ? '&#9660;' : '&#9644;');
  var txt = unit === 'c'
    ? Math.abs(Math.round(delta * 100)) + '&cent;'
    : '$' + Math.abs(delta).toFixed(2);
  return '<span class="pill ' + cls + '">' + arrow + ' ' + txt + ' / ' + label + '</span>';
}
function mkWhen(x) {
  if (!x.date) return '';
  if (x.live) {
    var t = Date.parse(x.date);
    if (isFinite(t)) {
      var d = new Date(t);
      return ('0' + d.getUTCHours()).slice(-2) + ('0' + d.getUTCMinutes()).slice(-2) + 'Z today';
    }
  }
  return String(x.date).slice(0, 10);
}
function renderMarket() {
  var slot = $('mkSlot'); if (!slot) return;
  if (!isProUser()) {
    slot.innerHTML = '<h2 class="sec">Market reference <span class="pill acc">Pro</span></h2>' +
      '<div class="card">' + upsellHTML('Official Jet A spot and live crude, so you know when the whole market moves.') + '</div>';
    return;
  }
  marketFetch().then(function (d) {
    var s = $('mkSlot'); if (!s) return;
    if (!d || (!d.jet && !d.wti)) { s.innerHTML = ''; return; }
    var h = '<h2 class="sec">Market reference</h2><div class="card">';
    if (d.jet) {
      h += '<div class="spread"><div>' +
        '<div class="lab" style="margin-bottom:2px">Jet A wholesale · Gulf Coast spot</div>' +
        '<span class="mono" style="font-size:24px;font-weight:700">$' + d.jet.v.toFixed(2) + '</span>' +
        '<span class="tiny muted"> /gal · ' + esc(mkWhen(d.jet)) + '</span></div>' +
        deltaChip(d.jet.delta, 'c', d.jet.dlabel || '30 d') + '</div>';
    }
    if (d.wti) {
      h += (d.jet ? '<hr class="dash">' : '') +
        '<div class="spread"><div><span class="lab" style="display:inline;margin:0">WTI crude</span> ' +
        (d.wti.live ? '<span class="pill dim">live</span> ' : '') +
        '<span class="mono" style="font-weight:700">$' + d.wti.v.toFixed(2) + '</span>' +
        '<span class="tiny muted"> /bbl · ' + esc(mkWhen(d.wti)) + '</span></div>' +
        deltaChip(d.wti.delta, '$', d.wti.dlabel || '30 d') + '</div>';
    }
    h += '<div class="micro muted" style="margin-top:8px">Wholesale benchmark (' + esc(d.source || 'market data') + '), not a ramp price. ' +
      'FBO retail runs well above this; the spread between FBOs on the same day is where the money is. ' +
      'Use it to spot when the whole market moves.</div></div>';
    s.innerHTML = h;
  });
}

/* ---------- winds aloft (FAA FB via /api/winds) ---------- */
var WINDS = { data: null, at: 0, ttl: 30 * 60 * 1000, pending: false, stnPts: null };
function windRegion(la, lo) {
  if (lo > -85 && la > 37.5) return 'bos';
  if (lo > -85) return 'mia';
  if (lo > -103 && la > 38) return 'chi';
  if (lo > -103) return 'dfw';
  if (la > 38.5) return 'slc';
  return 'sfo';
}
function windsFetch(region) {
  if (!wxAvailable()) return Promise.resolve(null);
  if (WINDS.data && WINDS.data.region === region && Date.now() - WINDS.at < WINDS.ttl) {
    return Promise.resolve(WINDS.data);
  }
  if (WINDS.pending) return Promise.resolve(null);
  WINDS.pending = true;
  return fetch('/api/winds?region=' + region)
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      if (!d || !d.stations) return null;
      WINDS.data = d; WINDS.at = Date.now();
      WINDS.stnPts = [];
      Object.keys(d.stations).forEach(function (id) {
        var ap = BY['K' + id];
        if (ap) WINDS.stnPts.push({ id: id, la: ap.la, lo: ap.lo });
      });
      return d;
    })
    .catch(function () { return null; })
    .finally(function () { WINDS.pending = false; });
}
function windInterp(levels, altFt) {
  var pts = levels.filter(function (l) { return l.dir != null || l.spd === 0; });
  if (!pts.length) return null;
  var lo = null, hi = null;
  pts.forEach(function (p) {
    if (p.alt <= altFt && (!lo || p.alt > lo.alt)) lo = p;
    if (p.alt >= altFt && (!hi || p.alt < hi.alt)) hi = p;
  });
  if (!lo) return vecOf(hi);
  if (!hi) return vecOf(lo);
  if (lo.alt === hi.alt) return vecOf(lo);
  var t = (altFt - lo.alt) / (hi.alt - lo.alt);
  var a = vecOf(lo), b = vecOf(hi);
  var u = a.u + (b.u - a.u) * t, v = a.v + (b.v - a.v) * t;
  var spd = Math.sqrt(u * u + v * v);
  var dir = (Math.atan2(u, v) * 180 / Math.PI + 180 + 360) % 360;
  return { dir: dir, spd: spd };
}
function vecOf(p) {
  if (p.dir == null) return { dir: null, spd: 0, u: 0, v: 0 };
  var r = (p.dir) * Math.PI / 180;
  return { dir: p.dir, spd: p.spd, u: -p.spd * Math.sin(r), v: -p.spd * Math.cos(r) };
}
function stationWind(la, lo, altFt) {
  if (!WINDS.data || !WINDS.stnPts || !WINDS.stnPts.length) return null;
  var best = null, bd = 1e9;
  WINDS.stnPts.forEach(function (s) {
    var d = hav({ la: la, lo: lo }, s);
    if (d < bd) { bd = d; best = s; }
  });
  if (!best || bd > 300) return null;
  var w = windInterp(WINDS.data.stations[best.id], altFt);
  if (!w) return null;
  return { dir: w.dir, spd: w.spd, stn: best.id };
}
function legWind(A, B) {
  if (!isProUser()) return null;
  var alt = num(S.settings.crzAlt, 26000);
  var w = stationWind((A.la + B.la) / 2, (A.lo + B.lo) / 2, alt);
  if (!w || w.dir == null) return null;
  var tas = Math.max(60, num(S.settings.ktas, 260));
  var d = (w.dir - bearing(A, B)) * Math.PI / 180;
  var head = w.spd * Math.cos(d), cross = w.spd * Math.sin(d);
  if (Math.abs(cross) >= tas) return null;
  var gs = Math.sqrt(tas * tas - cross * cross) - head;
  if (gs < 40) gs = 40;
  return { gs: gs, dir: Math.round(w.dir / 10) * 10, spd: Math.round(w.spd), alt: alt, stn: w.stn };
}
function loadTripWinds() {
  if (!isProUser()) return;
  var t = trip();
  if (!t || !t.legs.length) return;
  var A = null, B = null;
  for (var i = 0; i < t.legs.length; i++) {
    A = lookup(t.legs[i].from); B = lookup(t.legs[i].to);
    if (A && B) break;
  }
  if (!A || !B) return;
  var region = windRegion((A.la + B.la) / 2, (A.lo + B.lo) / 2);
  if (WINDS.data && WINDS.data.region === region && Date.now() - WINDS.at < WINDS.ttl) return;
  windsFetch(region).then(function (d) { if (d) renderTrip(); });
}

/* ---------- live weather (FAA AWC via /api/wx) ---------- */
var WXTTL = 5 * 60 * 1000;
var wxCache = {}; // code -> {at, metar, taf}
function wxAvailable() { return location.protocol === 'http:' || location.protocol === 'https:'; }
function wxFetch(codes, force) {
  if (!wxAvailable()) return Promise.resolve(null);
  var now = Date.now();
  var need = [];
  codes.forEach(function (c) {
    if (force || !wxCache[c] || now - wxCache[c].at > WXTTL) need.push(c);
  });
  if (!need.length) return Promise.resolve(wxCache);
  var ctrl = ('AbortController' in window) ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 9000) : null;
  return fetch('/api/wx?ids=' + need.join(','), ctrl ? { signal: ctrl.signal } : {})
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      need.forEach(function (c) { wxCache[c] = { at: now, metar: null, taf: null }; });
      (d.metar || []).forEach(function (m) { if (wxCache[m.icaoId]) wxCache[m.icaoId].metar = m; });
      (d.taf || []).forEach(function (t) { if (wxCache[t.icaoId]) wxCache[t.icaoId].taf = t; });
      return wxCache;
    })
    .catch(function () { return null; })
    .finally(function () { if (timer) clearTimeout(timer); });
}
function wxCat(m) {
  var v = 99;
  if (typeof m.visib === 'number') v = m.visib;
  else if (typeof m.visib === 'string') { var p = parseFloat(m.visib.replace('+', '')); if (isFinite(p)) v = p; }
  var ceil = 99999;
  (m.clouds || []).forEach(function (c) {
    if ((c.cover === 'BKN' || c.cover === 'OVC' || c.cover === 'VV') && c.base != null && c.base < ceil) ceil = c.base;
  });
  if (ceil < 500 || v < 1) return { k: 'LIFR', cls: 'lifr' };
  if (ceil < 1000 || v < 3) return { k: 'IFR', cls: 'ifr' };
  if (ceil <= 3000 || v <= 5) return { k: 'MVFR', cls: 'mvfr' };
  return { k: 'VFR', cls: 'vfr' };
}
function wxWind(m) {
  if (m.wdir == null && m.wspd == null) return '';
  var dir = (m.wdir === 'VRB' || m.wdir === 0 && !m.wspd) ? 'VRB' : (m.wdir == null ? '' : ('00' + m.wdir).slice(-3));
  if (!m.wspd) return 'calm';
  return dir + ('0' + m.wspd).slice(-2) + (m.wgst ? 'G' + m.wgst : '') + 'KT';
}
function wxVis(m) {
  if (m.visib == null) return '';
  return String(m.visib) + ' SM';
}
function wxAge(m) {
  if (!m.obsTime) return '';
  var min = Math.max(0, Math.round((Date.now() / 1000 - m.obsTime) / 60));
  var d = new Date(m.obsTime * 1000);
  var z = ('0' + d.getUTCHours()).slice(-2) + ('0' + d.getUTCMinutes()).slice(-2) + 'Z';
  return z + ' · ' + (min < 60 ? min + ' min ago' : Math.round(min / 60) + ' h ago');
}
function fmtTafRaw(raw) {
  return String(raw || '').replace(/\s(FM\d{6}|BECMG|TEMPO|PROB\d{2})/g, '\n$1');
}
function identHdg(endId) {
  var n = parseInt(String(endId || '').replace(/[LRC]/g, ''), 10);
  return isFinite(n) ? ((n * 10) % 360 || 360) : null;
}
function densityAlt(a, m) {
  if (m.temp == null || m.altim == null || a.e == null) return null;
  var inHg = m.altim * 0.029530;
  var pa = a.e + (29.92 - inHg) * 1000;
  var isa = 15 - 2 * (a.e / 1000);
  return Math.round(pa + 120 * (m.temp - isa));
}
/* Rule-of-thumb runway performance from the POH sea-level numbers in Settings.
   Takeoff grows about 8% per 1,000 ft of density altitude for turboprops, landing about 5%;
   headwind shortens 10% per 9 kt, tailwind lengthens 10% per 2 kt (FAA rules of thumb). */
function perfEstimate(a, daFt, hw) {
  var st = S.settings;
  var da = Math.max(0, daFt == null ? (a.e || 0) : daFt);
  var to = num(st.toSL, 2438) * (1 + 0.08 * da / 1000);
  var ldg = num(st.ldgSL, 2110) * (1 + 0.05 * da / 1000);
  if (hw != null && isFinite(hw)) {
    var wf = hw >= 0 ? (1 - 0.10 * Math.min(hw, 27) / 9) : (1 + 0.10 * Math.min(-hw, 10) / 2);
    to *= wf; ldg *= wf;
  }
  var req = Math.max(to, ldg);
  return { da: Math.round(da), to: Math.round(to), ldg: Math.round(ldg), req: Math.round(req), margin: Math.round(req * 1.5), hw: hw };
}
function perfHTML(a, est, label) {
  var rows = (a.r || []).map(function (r) {
    var ratio = r.l / est.req;
    var cls = ratio >= 1.5 ? 'good' : (ratio >= 1.2 ? 'warn' : 'bad');
    var word = ratio >= 1.5 ? '50% margin' : (ratio >= 1.2 ? 'thin margin' : (ratio >= 1 ? 'no margin' : 'too short'));
    return '<div class="rwrow"><span class="dot ' + cls + '"></span><span class="rid">' + esc(r.id) + '</span>' +
      '<span class="dims">' + fmtNum(r.l) + ' ft avail <span class="x">·</span> ' + word + '</span>' +
      '<span class="micro muted mono">' + (ratio >= 10 ? '10x' : ratio.toFixed(1) + 'x') + '</span></div>';
  }).join('');
  return '<div class="lab" style="margin:10px 0 4px">' + label + '</div>' +
    '<div class="tiny" style="margin-bottom:4px">Takeoff needs about <b class="mono">' + fmtNum(est.to) + ' ft</b>, landing <b class="mono">' + fmtNum(est.ldg) + ' ft</b>' +
    ' <span class="muted">(' + fmtNum(est.margin) + ' ft with a 50% margin, DA ' + fmtNum(est.da) + ' ft' + (est.hw != null ? ', ' + (est.hw >= 0 ? Math.round(est.hw) + ' kt head' : Math.round(-est.hw) + ' kt tail') : ', no wind') + ')</span></div>' +
    rows +
    '<div class="micro muted" style="margin-top:6px">Rule-of-thumb estimate from your ' + esc(S.settings.acType || 'airplane') + ' book numbers (' + fmtNum(S.settings.toSL) + ' / ' + fmtNum(S.settings.ldgSL) + ' ft at sea level). Not a POH calculation.</div>';
}
function bestHeadwind(a, m) {
  if (!m || m.wdir == null || m.wdir === 'VRB' || !m.wspd) return 0;
  var best = null;
  (a.r || []).forEach(function (r) {
    var ends = String(r.id).split('/');
    var h0 = (r.h != null) ? r.h : identHdg(ends[0]);
    if (h0 == null) return;
    [{ h: h0 }, { h: (h0 + 180) % 360 }].forEach(function (c) {
      var hw = m.wspd * Math.cos((m.wdir - c.h) * Math.PI / 180);
      if (best == null || hw > best) best = hw;
    });
  });
  return best == null ? 0 : best;
}
function rwWindBlock(a, m) {
  var head = '<div class="lab" style="margin:10px 0 4px">Runway winds now</div>';
  if (!isProUser()) return head + upsellHTML('Head and crosswind per runway from the live METAR, with the best runway picked for you.');
  if (m.wdir == null || m.wdir === 'VRB' || !m.wspd) {
    return head + '<div class="tiny muted">' +
      (m.wspd ? 'Wind variable at ' + m.wspd + ' kt; components depend on the swing.' : 'Wind calm. Take your pick.') +
      '</div>';
  }
  var wd = m.wdir, ws = m.wspd, wg = m.wgst || 0;
  var rows = [], best = null;
  (a.r || []).forEach(function (r) {
    var ends = String(r.id).split('/');
    var h0 = (r.h != null) ? r.h : identHdg(ends[0]);
    if (h0 == null || !ends[0]) return;
    var cand = [{ e: ends[0], h: h0 }];
    if (ends[1]) cand.push({ e: ends[1], h: (h0 + 180) % 360 || 360 });
    var pick = null;
    cand.forEach(function (c) {
      var d = (wd - c.h) * Math.PI / 180;
      var hw = ws * Math.cos(d), xw = ws * Math.sin(d);
      var xg = wg ? wg * Math.sin(d) : 0;
      var rec = { end: c.e, r: r, hw: hw, xw: xw, xg: xg, approx: r.h == null };
      if (!pick || rec.hw > pick.hw) pick = rec;
    });
    if (pick) {
      rows.push(pick);
      if (!best || pick.hw > best.hw || (Math.abs(pick.hw - best.hw) < 1 && pick.r.l > best.r.l)) best = pick;
    }
  });
  if (!rows.length) return '';
  rows.sort(function (x, y) { return y.hw - x.hw; });
  var h = head;
  if (best) h += '<div style="margin:2px 0 8px"><span class="pill acc">Best now: ' + esc(best.end) + '</span></div>';
  h += rows.map(function (p) {
    var xa = Math.round(Math.abs(p.xw)), xga = Math.round(Math.abs(p.xg));
    var side = p.xw > 1 ? 'R' : (p.xw < -1 ? 'L' : '');
    var xmax = Math.max(xa, xga);
    var cls = xmax <= 10 ? 'good' : (xmax <= 16 ? 'warn' : 'bad');
    var hwTxt = p.hw >= -1
      ? Math.round(Math.max(0, p.hw)) + ' kt head'
      : '<span style="color:var(--bad)">' + Math.round(-p.hw) + ' kt tail</span>';
    var xwTxt = xa + (xga > xa ? 'G' + xga : '') + ' kt ' + side + ' cross';
    return '<div class="rwrow">' +
      '<span class="dot ' + cls + '"></span>' +
      '<span class="rid">' + esc(p.end) + (p.approx ? '<span class="muted">&#8776;</span>' : '') + '</span>' +
      '<span class="dims">' + hwTxt + ' <span class="x">·</span> ' + xwTxt + '</span>' +
      '<span class="micro muted mono">' + fmtNum(p.r.l) + '&times;' + fmtNum(p.r.w) + '</span>' +
    '</div>';
  }).join('');
  return h;
}
var NOTAM_OFF = false;
function loadNotams(a) {
  var slot = $('notamSlot'); if (!slot || NOTAM_OFF) return;
  if (!isProUser()) { slot.innerHTML = ''; return; }
  api('/api/notams?icao=' + encodeURIComponent(a.c)).then(function (r) {
    if (curDetail !== a) return;
    var sl = $('notamSlot'); if (!sl) return;
    if (!r.ok) { sl.innerHTML = ''; return; }
    if (r.data.configured === false) { NOTAM_OFF = true; sl.innerHTML = ''; return; }
    var list = r.data.notams || [];
    var rw = list.filter(function (n) { return n.runway; }), other = list.filter(function (n) { return !n.runway; });
    var h = '<div class="card"><div class="spread"><div class="wxline">' +
      (rw.length ? '<span class="pill bad">' + rw.length + ' runway closure' + (rw.length === 1 ? '' : 's') + '</span>' : '<span class="pill good">No runway closures</span>') +
      '<span class="tiny muted">' + list.length + ' NOTAM' + (list.length === 1 ? '' : 's') + ' · FAA NMS</span></div>' +
      (list.length ? '<button class="btn small ghost" id="ntToggle">Show</button>' : '') + '</div>' +
      '<div id="ntList" style="display:none;margin-top:8px">' +
        rw.concat(other).map(function (n) {
          return '<div class="wxraw" style="margin-top:6px' + (n.runway ? ';border-color:var(--bad)' : (n.closure ? ';border-color:var(--warn)' : '')) + '">' + esc(n.text) +
            (n.end ? '<div class="micro muted" style="margin-top:4px">until ' + esc(String(n.end).slice(0, 16).replace('T', ' ')) + 'Z</div>' : '') + '</div>';
        }).join('') +
      '</div></div>';
    sl.innerHTML = h;
    var tg = $('ntToggle');
    if (tg) tg.addEventListener('click', function () { var l = $('ntList'); var open = l.style.display !== 'none'; l.style.display = open ? 'none' : ''; tg.textContent = open ? 'Show' : 'Hide'; });
  });
}
function loadAptWx(a, force) {
  var slot = $('wxSlot'); if (!slot) return;
  wxFetch([a.c], force).then(function (map) {
    if (curDetail !== a) return;
    var d = map && map[a.c];
    var s = $('wxSlot'); if (!s) return;
    if (!d || !d.metar) { s.innerHTML = ''; return; }
    var m = d.metar, cat = wxCat(m);
    var h = '<div class="card">' +
      '<div class="spread"><div class="wxline">' +
        '<span class="pill ' + cat.cls + '">' + cat.k + '</span>' +
        '<span class="mono" style="font-weight:700">' + esc(wxWind(m)) + '</span>' +
        '<span class="mono">' + esc(wxVis(m)) + '</span>' +
        (m.temp != null ? '<span class="mono">' + Math.round(m.temp) + '/' + (m.dewp != null ? Math.round(m.dewp) : '') + '&deg;C</span>' : '') +
        (m.altim != null ? '<span class="mono">A' + (m.altim * 0.029530).toFixed(2).replace('.', '') + '</span>' : '') +
      '</div>' +
      '<button class="iconbtn" id="wxRefresh" aria-label="Refresh weather">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>' +
      '</button></div>' +
      '<div class="micro muted" style="margin-top:4px">METAR ' + esc(wxAge(m)) + ' · live FAA data</div>' +
      (function () {
        var da = densityAlt(a, m);
        if (da == null) return '';
        var delta = da - a.e;
        var hot = delta > 2000;
        return '<div class="micro' + (hot ? '' : ' muted') + '" style="margin-top:2px' + (hot ? ';color:var(--warn)' : '') + '">' +
          'Field ' + fmtNum(a.e) + ' ft · density altitude ' + fmtNum(da) + ' ft' + (hot ? ' (+' + fmtNum(delta) + ')' : '') + '</div>';
      })() +
      '<pre class="wxraw">' + esc(m.rawOb || '') + '</pre>' +
      rwWindBlock(a, m) +
      (d.taf && d.taf.rawTAF
        ? '<button class="btn small ghost" id="wxTafBtn" style="margin-top:8px">TAF</button>' +
          '<pre class="wxraw" id="wxTaf" style="display:none">' + esc(fmtTafRaw(d.taf.rawTAF)) + '</pre>'
        : '') +
    '</div>';
    s.innerHTML = h;
    var rb = $('wxRefresh');
    if (rb) rb.addEventListener('click', function () { loadAptWx(a, true); });
    var ps = $('perfSlot');
    if (ps && isProUser()) {
      var da = densityAlt(a, m);
      ps.innerHTML = perfHTML(a, perfEstimate(a, da, bestHeadwind(a, m)), 'Runway math for your airplane, right now');
    }
    var tb = $('wxTafBtn');
    if (tb) tb.addEventListener('click', function () {
      var t = $('wxTaf'); t.style.display = t.style.display === 'none' ? 'block' : 'none';
    });
  });
}
function loadTripWx() {
  var spans = document.querySelectorAll('[data-wxfor]');
  if (!spans.length) return;
  var codes = [];
  spans.forEach(function (s) { if (codes.indexOf(s.dataset.wxfor) === -1) codes.push(s.dataset.wxfor); });
  wxFetch(codes).then(function (map) {
    if (!map) return;
    document.querySelectorAll('[data-wxfor]').forEach(function (s) {
      var d = map[s.dataset.wxfor];
      if (!d || !d.metar) return;
      var cat = wxCat(d.metar);
      s.innerHTML = '<span class="pill ' + cat.cls + '">' + cat.k + '</span>' +
        '<span class="mono">' + esc(wxWind(d.metar)) + ' ' + esc(wxVis(d.metar)) + '</span>';
    });
  });
}

/* ---------- theme ---------- */
function applyTheme() {
  var t = S.settings.theme || 'auto';
  var root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  $('themeBtn').textContent = t === 'auto' ? 'AUTO' : (t === 'light' ? 'DAY' : 'NIGHT');
  $('themeBtn').setAttribute('aria-label', 'Theme: ' + t + '. Change color theme');
  $('themeBtn').title = 'Theme: ' + t;
  if (curDetail) { drawRwMap(curDetail); }
}
$('themeBtn').addEventListener('click', function () {
  var order = ['auto', 'light', 'dark'];
  var i = order.indexOf(S.settings.theme || 'auto');
  S.settings.theme = order[(i + 1) % 3];
  save(); applyTheme();
});

/* ---------- tabs ---------- */
var TABS = ['trip', 'apt', 'fuel', 'account'];
var curTab = 'trip';
function showTab(t) {
  curTab = t;
  document.body.classList.remove('is-welcome');
  $('tab-welcome').classList.remove('on'); $('tab-welcome').hidden = true;
  document.querySelector('nav.tabs').hidden = false;
  TABS.forEach(function (k) {
    var panel = $('tab-' + k), tab = $('tb-' + k), on = k === t;
    panel.classList.toggle('on', on); panel.hidden = !on;
    tab.classList.toggle('on', on); tab.setAttribute('aria-selected', on ? 'true' : 'false'); tab.tabIndex = on ? 0 : -1;
  });
  window.scrollTo(0, 0);
  if (t === 'trip') renderTrip();
  if (t === 'fuel') renderFuel();
  if (t === 'account') renderAccount();
}
function showWelcome() {
  curTab = 'welcome';
  document.body.classList.add('is-welcome');
  TABS.forEach(function (k) {
    $('tab-' + k).classList.remove('on'); $('tab-' + k).hidden = true;
    $('tb-' + k).classList.remove('on'); $('tb-' + k).setAttribute('aria-selected', 'false'); $('tb-' + k).tabIndex = -1;
  });
  document.querySelector('nav.tabs').hidden = true;
  $('tab-welcome').classList.add('on'); $('tab-welcome').hidden = false;
  renderWelcome();
  window.scrollTo(0, 0);
}
TABS.forEach(function (k) { $('tb-' + k).addEventListener('click', function () { showTab(k); }); });
$('tabNav').addEventListener('keydown', function (e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
  e.preventDefault();
  var i = TABS.indexOf(curTab);
  if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = TABS.length - 1;
  else i = (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
  showTab(TABS[i]); $('tb-' + TABS[i]).focus();
});
function renderGate() {
  if (loggedIn() || S.browse) showTab(loggedIn() ? (curTab === 'welcome' ? 'trip' : curTab) : (curTab === 'trip' || curTab === 'fuel' ? 'apt' : curTab));
  else showWelcome();
}
function lockedHTML(what) {
  return '<div class="card lockcard">' +
    '<div class="lab" style="margin-bottom:6px">Free account required</div>' +
    '<div style="font-size:14px;margin-bottom:12px">' + what + '</div>' +
    '<div class="btnrow"><button class="btn primary" data-auth="register">Create free account</button>' +
    '<button class="btn" data-auth="login">Sign in</button></div>' +
    '<div class="micro muted" style="margin-top:8px">Includes a 14-day Pro trial. No card needed.</div></div>';
}
function upsellHTML(what) {
  var cta = loggedIn() ? '<button class="btn primary small" data-gopro="1">Go Pro</button>'
                       : '<button class="btn primary small" data-auth="register">Start free trial</button>';
  return '<div class="upsell"><span class="pill acc">Pro</span> <span class="tiny">' + what + '</span> ' + cta + '</div>';
}
document.addEventListener('click', function (e) {
  var a = e.target.closest('[data-auth]');
  if (a) { openAuth(a.dataset.auth); return; }
  var g = e.target.closest('[data-gopro]');
  if (g) { showTab('account'); setTimeout(function () { var el = $('planCard'); if (el) el.scrollIntoView({ block: 'start' }); }, 50); }
});

/* ---------- subline ---------- */
function renderSub() {
  var tail = (S.settings.tail || '').trim().toUpperCase();
  $('subline').textContent = (tail ? tail + ' · ' : '') + 'TRIP COST · FUEL · RUNWAYS';
}

/* ================= TRIP TAB ================= */
var addingLeg = null; // {from,to}
function trip() { return S.trips.find(function (t) { return t.id === S.activeTrip; }) || null; }

function renderTripChips() {
  var h = S.trips.map(function (t) {
    return '<button class="tchip' + (t.id === S.activeTrip ? ' on' : '') + '" data-trip="' + esc(t.id) + '">' + esc(t.name || 'Trip') + '</button>';
  }).join('');
  h += canEdit() ? '<button class="tchip" data-newtrip="1">+ New</button>' : '<span class="pill dim" style="align-self:center">view only</span>';
  $('tripChips').innerHTML = h;
}

function legCardHTML(leg, i) {
  var A = lookup(leg.from), B = lookup(leg.to);
  if (!A || !B) {
    return '<div class="card leg v-bad"><div class="spread"><div class="legroute">' + esc(leg.from) +
      ' <span class="arr">&#9656;</span> ' + esc(leg.to) + '</div>' +
      '<button class="iconbtn" data-delleg="' + i + '" aria-label="Delete leg">&#10005;</button></div>' +
      '<div class="tiny muted" style="margin-top:6px">Airport not in database. Check the code.</div></div>';
  }
  var c = legCalc(A, B);
  var br = bestRw(B), tier = br ? rTier(br) : 2, tw = TIER[tier];
  return '<div class="card leg v-' + tw.cls + '">' +
    '<div class="spread">' +
      '<div class="legroute">' + esc(A.c) + ' <span class="arr">&#9656;</span> ' + esc(B.c) + '</div>' +
      '<button class="iconbtn" data-delleg="' + i + '" aria-label="Delete leg">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="legstats">' +
      '<span class="stat"><span class="n">' + fmtNm(c.d) + '</span><span class="u">nm</span></span>' +
      '<span class="stat"><span class="n">' + fmtMin(c.block).replace(' min', '').replace(/ h /, ':').replace(/ m$/, '') + '</span><span class="u">' + (c.block < 60 ? 'min block' : 'block') + '</span></span>' +
      (c.wind ? '<span class="stat"><span class="n">' + fmtNum(c.wind.gs) + '</span><span class="u">kt GS</span></span>' : '') +
      '<span class="stat"><span class="n">' + fmtNum(c.burn) + '</span><span class="u">gal est</span></span>' +
      '<span class="stat"><span class="n">' + fmtMoney(c.cost) + '</span><span class="u">@ $' + num(S.settings.price).toFixed(2) + '</span></span>' +
    '</div>' +
    (c.wind ? '<div class="micro muted" style="margin-top:3px">winds aloft ' + ('00' + c.wind.dir).slice(-3) + '/' + ('0' + c.wind.spd).slice(-2) + ' at FL' + Math.round(c.wind.alt / 100) + ' (' + esc(c.wind.stn) + ')</div>' : '') +
    '<button class="arrbox" style="width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit" data-openapt="' + esc(B.c) + '">' +
      '<div class="spread">' +
        '<div>' +
          '<div class="micro muted" style="letter-spacing:.1em;text-transform:uppercase;font-family:var(--disp);font-weight:600">Landing at ' + esc(B.c) + ' · ' + esc(B.m || B.n) + '</div>' +
          (br ? '<div class="mono tiny" style="margin-top:3px">' + esc(br.id) + ' · ' + fmtNum(br.l) + ' &times; ' + fmtNum(br.w) + ' ft · ' + (br.lit ? 'LIT' : '<span style="color:var(--bad)">UNLIT</span>') + '</div>' : '') +
        '<span class="wxmini" data-wxfor="' + esc(B.c) + '"></span>' +
        '</div>' +
        '<span class="pill ' + tw.cls + '">' + tw.word + '</span>' +
      '</div>' +
    '</button>' +
  '</div>';
}

function shareBrief(t) {
  var legs = [];
  t.legs.forEach(function (l) {
    var A = lookup(l.from), B = lookup(l.to); if (!A || !B) return;
    var c = legCalc(A, B), br = bestRw(B);
    legs.push({ from: A.c, to: B.c, fromName: A.n, toName: B.n, nm: c.d, block: c.block, burn: c.burn, cost: c.cost, gs: c.wind ? c.wind.gs : 0,
      wind: c.wind ? 'winds ' + ('00' + c.wind.dir).slice(-3) + '/' + ('0' + c.wind.spd).slice(-2) + ' at FL' + Math.round(c.wind.alt / 100) : '',
      rw: br ? br.id + ' ' + fmtNum(br.l) + ' x ' + fmtNum(br.w) + ' ft' : '', note: S.notes[B.c] ? String(S.notes[B.c]).slice(0, 200) : '' });
  });
  if (!legs.length) { showToast('Add legs with airports from the database first.'); return; }
  var payload = { name: t.name || 'Trip', tail: S.settings.tail || '', aircraft: S.settings.acType || '', price: num(S.settings.price), legs: legs };
  var out = $('briefOut'); if (out) out.textContent = 'Building the brief...';
  api('/api/brief', { body: { trip: payload } }).then(function (r) {
    if (!r.ok) { if (out) out.textContent = ''; showToast(r.data.error || 'Could not build the brief.'); return; }
    var url = r.data.url;
    if (out) out.innerHTML = 'Brief link (valid 180 days): <a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url.replace(/^https?:\/\//, '')) + '</a>';
    if (navigator.share) { navigator.share({ title: (t.name || 'Trip') + ' brief', url: url }).catch(function () {}); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { showToast('Link copied.'); }).catch(function () {}); }
  });
}
function renderTrip() {
  if (!loggedIn()) {
    $('tripChips').innerHTML = '';
    $('tripBody').innerHTML = lockedHTML('Trips with distance, block time, burn and cost per leg, plus winds-aloft groundspeeds and arrival runway verdicts.');
    return;
  }
  renderTripChips();
  var t = trip();
  var body = verifyNoticeHTML();
  if (!t) {
    body += '<div class="empty">No trips yet. Tap <b>+ New</b> to start one.</div>';
    $('tripBody').innerHTML = body;
    return;
  }
  body += '<div class="card flat" style="padding:10px 12px">' +
    '<div class="rowline">' +
      '<input class="t" style="border:none;background:transparent;padding:4px 2px;min-height:36px;font-family:var(--disp);font-weight:600;font-size:19px;letter-spacing:.03em" id="tripName" value="' + esc(t.name) + '" aria-label="Trip name">' +
      '<button class="btn small danger" id="delTrip">Delete</button>' +
    '</div></div>';

  if (!t.legs.length) {
    body += '<div class="empty">No legs yet. Add the first one.</div>';
  } else {
    body += t.legs.map(legCardHTML).join('');
  }

  /* add-leg form */
  if (addingLeg) {
    body += '<div class="card" id="addLegCard">' +
      '<div class="lab">New leg</div>' +
      '<div class="grid2">' +
        '<div><input class="t mono" id="alFrom" placeholder="From" autocapitalize="characters" autocomplete="off" value="' + esc(addingLeg.from) + '"><div id="alFromSug"></div></div>' +
        '<div><input class="t mono" id="alTo" placeholder="To" autocapitalize="characters" autocomplete="off" value="' + esc(addingLeg.to) + '"><div id="alToSug"></div></div>' +
      '</div>' +
      '<div class="btnrow" style="margin-top:10px">' +
        '<button class="btn primary" id="alAdd">Add leg</button>' +
        '<button class="btn ghost" id="alCancel">Cancel</button>' +
      '</div>' +
      '<div class="micro muted" id="alErr" style="margin-top:6px"></div>' +
    '</div>';
  } else if (canEdit()) {
    body += '<div class="btnrow" style="margin:2px 0 6px">' +
      '<button class="btn" id="addLegBtn">+ Add leg</button>' +
      (t.legs.length ? '<button class="btn ghost" id="addRetBtn">&#8646; Add return</button>' : '') +
    '</div>';
  }

  /* totals */
  if (t.legs.length) {
    var td = 0, tb = 0, tg = 0, ok = true, windsUsed = false;
    var codes = [];
    t.legs.forEach(function (l, i) {
      var A = lookup(l.from), B = lookup(l.to);
      if (!A || !B) { ok = false; return; }
      var c = legCalc(A, B);
      td += c.d; tb += c.block; tg += c.burn;
      if (c.wind) windsUsed = true;
      if (i === 0) codes.push(A.c);
      codes.push(B.c);
    });
    if (ok) {
      var route = codes.join(' ');
      body += '<h2 class="sec">Trip total</h2><div class="card">' +
        '<div class="legstats bigtotal">' +
          '<span class="stat"><span class="n">' + fmtNm(td) + '</span><span class="u">nm</span></span>' +
          '<span class="stat"><span class="n">' + fmtMin(tb) + '</span><span class="u">block</span></span>' +
          '<span class="stat"><span class="n">' + fmtNum(tg) + '</span><span class="u">gal est</span></span>' +
          '<span class="stat"><span class="n">' + fmtMoney(tg * num(S.settings.price)) + '</span><span class="u">fuel est</span></span>' +
        '</div>' +
        '<hr class="dash">' +
        '<div class="rowline">' +
          '<span class="lab" style="margin:0;flex:1">Plan $/gal</span>' +
          '<input class="t mono" id="tripPrice" type="number" inputmode="decimal" step="0.05" min="0" style="width:110px;min-height:38px" value="' + esc(num(S.settings.price).toFixed(2)) + '">' +
        '</div>' +
        '<div class="btnrow" style="margin-top:10px">' +
          '<a class="lbtn" href="foreflightmobile://maps/search?q=' + encodeURIComponent(route) + '">Open route in ForeFlight</a>' +
          (isProUser() ? '<button class="btn small" id="briefBtn">Share owner brief</button>' : '') +
        '</div>' +
        (isProUser() ? '' : '<div style="margin-top:8px">' + upsellHTML('A clean one-page cost brief for the owner, as a link that prints.') + '</div>') +
        '<div id="briefOut" class="tiny" style="margin-top:6px"></div>' +
        '<div class="micro muted" style="margin-top:6px">' + esc(route) + ' · ' + esc(String(S.settings.ktas)) + ' KTAS, ' + esc(String(S.settings.gph)) + ' gph' +
        (windsUsed ? ' · FB winds ' + esc(WINDS.data && WINDS.data.valid ? WINDS.data.valid : '') + ' applied' : '') +
        '. Tune in Settings.</div>' +
      '</div>';
    }
  }
  $('tripBody').innerHTML = body;

  /* wire */
  var tn = $('tripName');
  if (tn) tn.addEventListener('change', function () { t.name = tn.value.trim() || 'Trip'; save(); queueTrips(); renderTripChips(); });
  var dt = $('delTrip');
  if (dt) dt.addEventListener('click', function () {
    if (dt.dataset.armed) {
      S.trips = S.trips.filter(function (x) { return x.id !== t.id; });
      S.activeTrip = S.trips.length ? S.trips[0].id : null;
      save(); queueTrips(); renderTrip();
    } else {
      dt.dataset.armed = '1'; dt.textContent = 'Sure?';
      setTimeout(function () { if (dt.isConnected) { delete dt.dataset.armed; dt.textContent = 'Delete'; } }, 2600);
    }
  });
  var ab = $('addLegBtn');
  if (ab) ab.addEventListener('click', function () {
    var fx = fixFresh(15);
    var pre = t.legs.length ? t.legs[t.legs.length - 1].to
      : ((fx && nearestCode(fx)) || S.settings.homeBase || '');
    addingLeg = { from: pre, to: '' };
    renderTrip();
    var el = $('alTo'); if (el) el.focus();
  });
  var rb = $('addRetBtn');
  if (rb) rb.addEventListener('click', function () {
    var last = t.legs[t.legs.length - 1];
    t.legs.push({ from: last.to, to: last.from });
    save(); queueTrips(); renderTrip();
  });
  if (addingLeg) {
    wireSuggest($('alFrom'), $('alFromSug'), function (code) { addingLeg.from = code; });
    wireSuggest($('alTo'), $('alToSug'), function (code) { addingLeg.to = code; });
    $('alAdd').addEventListener('click', function () {
      var f = lookup($('alFrom').value), g = lookup($('alTo').value);
      if (!f || !g) { $('alErr').textContent = 'Enter airports from the database (try the K-code, like KBDR).'; return; }
      t.legs.push({ from: f.c, to: g.c });
      addingLeg = null; save(); queueTrips(); renderTrip();
    });
    $('alCancel').addEventListener('click', function () { addingLeg = null; renderTrip(); });
  }
  var tp = $('tripPrice');
  if (tp) tp.addEventListener('change', function () { S.settings.price = num(tp.value, S.settings.price); save(); renderTrip(); });
  var bb = $('briefBtn');
  if (bb) bb.addEventListener('click', function () { shareBrief(t); });
  $('tripBody').querySelectorAll('[data-delleg]').forEach(function (b) {
    b.addEventListener('click', function () {
      t.legs.splice(parseInt(b.dataset.delleg, 10), 1); save(); queueTrips(); renderTrip();
    });
  });
  $('tripBody').querySelectorAll('[data-openapt]').forEach(function (b) {
    b.addEventListener('click', function () { openApt(b.dataset.openapt); showTab('apt'); });
  });
  loadTripWx();
  loadTripWinds();
}
$('tripChips').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.newtrip) {
    if (!isProUser() && S.trips.length >= 1) {
      showToast('Free accounts keep one trip. Go Pro for unlimited trips.');
      showTab('account'); return;
    }
    var id = 't' + Date.now();
    S.trips.push({ id: id, name: 'New Trip', legs: [] });
    S.activeTrip = id; addingLeg = null; save(); queueTrips(); renderTrip();
  } else if (b.dataset.trip) {
    S.activeTrip = b.dataset.trip; addingLeg = null; save(); renderTrip();
  }
});

/* ---------- search core ---------- */
function search(q, cap) {
  q = (q || '').trim().toUpperCase();
  if (q.length < 2) return [];
  var exact = [], pref = [], sub = [];
  for (var i = 0; i < AP.length; i++) {
    var a = AP[i];
    var code = a.c, faa = a.f || '';
    if (code === q || faa === q || code === 'K' + q) { exact.push(a); continue; }
    if (code.indexOf(q) === 0 || (faa && faa.indexOf(q) === 0)) { pref.push(a); continue; }
    if (q.length >= 3) {
      var hay = (a.n + ' ' + (a.m || '')).toUpperCase();
      if (hay.indexOf(q) !== -1) sub.push(a);
    }
  }
  var rank = function (a) { return (a.t === 'L' ? 0 : a.t === 'M' ? 1 : 2) - (a.sch ? 0.5 : 0); };
  pref.sort(function (x, y) { return rank(x) - rank(y); });
  sub.sort(function (x, y) { return rank(x) - rank(y); });
  return exact.concat(pref, sub).slice(0, cap || 12);
}
function wireSuggest(input, sugBox, onPick) {
  if (!input) return;
  var render = function () {
    var rs = search(input.value, 5);
    sugBox.innerHTML = rs.map(function (a) {
      return '<button class="result" data-pick="' + esc(a.c) + '" style="margin-top:6px;margin-bottom:0">' +
        '<span class="code">' + esc(a.c) + '</span>' +
        '<span class="nm"><span class="n1">' + esc(a.n) + '</span><span class="n2">' + esc((a.m || '') + ', ' + a.st) + '</span></span>' +
      '</button>';
    }).join('');
  };
  input.addEventListener('input', render);
  sugBox.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]'); if (!b) return;
    input.value = b.dataset.pick; onPick(b.dataset.pick); sugBox.innerHTML = '';
  });
}

/* ================= AIRPORTS TAB ================= */
var curDetail = null;
$('aptSearch').addEventListener('input', function () {
  if (GEO.mode) { GEO.mode = false; $('nearFilters').style.display = 'none'; $('nearStatus').textContent = ''; }
  var rs = search(this.value, 14);
  $('aptResults').innerHTML = rs.map(function (a) {
    var br = bestRw(a), tier = br ? rTier(br) : 2;
    return '<button class="result" data-apt="' + esc(a.c) + '">' +
      '<span class="dot ' + TIER[tier].cls + '"></span>' +
      '<span class="code">' + esc(a.c) + '</span>' +
      '<span class="nm"><span class="n1">' + esc(a.n) + '</span><span class="n2">' + esc((a.m || '') + ', ' + a.st) + '</span></span>' +
      (br ? '<span class="rw">' + fmtNum(br.l) + '&times;' + fmtNum(br.w) + '</span>' : '') +
    '</button>';
  }).join('') || (this.value.trim().length >= 2 ? '<div class="empty">Nothing matches. Paved 2,500 ft+ US fields only.</div>' : '');
});
$('aptResults').addEventListener('click', function (e) {
  var b = e.target.closest('[data-apt]'); if (!b) return;
  openApt(b.dataset.apt);
});
$('nearBtn').addEventListener('click', function () {
  if (GEO.busy) return;
  GEO.busy = true;
  $('aptSearch').value = '';
  $('nearStatus').textContent = 'Getting your position&hellip;'.replace('&hellip;', '…');
  geoLocate().then(function () {
    GEO.busy = false;
    GEO.mode = true;
    renderNear();
  });
});
$('nearFilters').addEventListener('click', function (e) {
  var b = e.target.closest('[data-nf]'); if (!b) return;
  GEO.filter = b.dataset.nf;
  $('nearFilters').querySelectorAll('button').forEach(function (x) { x.classList.toggle('primary', x === b); });
  renderNear();
});

var altRadius = 40;
function openApt(code, noFetch) {
  var a = lookup(code); if (!a) return;
  curDetail = a;
  $('aptSearchView').style.display = 'none';
  var v = $('aptDetailView');
  v.style.display = 'block';
  var tier = aptTier(a), tw = TIER[tier];
  var noteVal = S.notes[a.c] || '';
  var log = (S.fuelLog[a.c] || []).slice().sort(function (x, y) { return y.date < x.date ? -1 : 1; });

  var h = '<button class="btn small ghost" id="aptBack" style="margin-bottom:10px">&#8592; Search</button>' +
    '<div class="card apthead">' +
      '<div class="spread">' +
        '<div><div class="code">' + esc(a.c) + (a.f && a.f !== a.c ? ' <span class="muted tiny mono">/ ' + esc(a.f) + '</span>' : '') + '</div>' +
        '<div class="aname">' + esc(a.n) + '</div>' +
        '<div class="tiny muted">' + esc((a.m || '') + ', ' + a.st) + ' · elev ' + (a.e == null ? '?' : fmtNum(a.e)) + ' ft</div>' +
        (function () {
          var fx = fixFresh(30);
          if (!fx) return '';
          var dnm = hav(fx, a);
          var brg = Math.round(bearing({ la: fx.la, lo: fx.lo }, a)) || 360;
          var age = fixAgeMin();
          return '<div class="tiny muted mono" style="margin-top:2px">' + fmtNm(dnm) + ' nm from you · brg ' +
            ('00' + brg).slice(-3) + '&deg;T' + (age > 10 ? ' · fix ' + age + ' min old' : '') + '</div>';
        })() + '</div>' +
        '<span class="pill ' + tw.cls + '">' + tw.word + '</span>' +
      '</div>' +
      linkRow(a) +
    '</div>' +
    '<div id="wxSlot"></div><div id="notamSlot"></div>';

  h += '<h2 class="sec">Runways</h2><div class="card">';
  h += '<canvas class="rwmap" id="rwMap"></canvas>';
  h += (a.r || []).map(function (r) {
    var t = rTier(r);
    return '<div class="rwrow">' +
      '<span class="dot ' + TIER[t].cls + '"></span>' +
      '<span class="rid">' + esc(r.id) + '</span>' +
      '<span class="dims">' + fmtNum(r.l) + ' <span class="x">&times;</span> ' + fmtNum(r.w) + ' ft <span class="x">· ' + esc(r.s) + '</span></span>' +
      '<span class="pill ' + (r.lit ? 'dim' : 'bad') + '">' + (r.lit ? 'LIT' : 'UNLIT') + '</span>' +
    '</div>';
  }).join('');
  h += '<div class="micro muted" style="margin-top:8px">Wide open: 5,000 &times; 100 ft or better. Workable: 4,000 &times; 75. Under that, be on your game.</div>';
  h += '<div id="perfSlot">' + (isProUser()
    ? perfHTML(a, perfEstimate(a, null, null), 'Runway math for your airplane (field elevation, ISA, no wind)')
    : '<div style="margin-top:10px">' + upsellHTML('Takeoff and landing distance for your airplane on each runway, corrected for today\'s density altitude and wind.') + '</div>') + '</div></div>';

  /* services and fees (FAA NASR) */
  h += '<h2 class="sec">Services and fees</h2><div class="card">';
  h += '<div class="wxline" style="margin-bottom:8px">' +
    (hasJetA(a) ? '<span class="pill good">Jet A</span>'
      : (a.fu ? '<span class="pill bad">No Jet A</span>' : '<span class="pill dim">No fuel on file</span>')) +
    (a.fu && a.fu.indexOf('100') !== -1 ? '<span class="pill dim">100LL</span>' : '') +
    (a.fee ? '<span class="pill warn">Landing fee</span>' : '') +
    (a.fu ? '<span class="micro muted mono">' + esc(a.fu) + '</span>' : '') +
  '</div>';
  if (a.mx) {
    var ma = MXWORD[a.mx.charAt(0)] || MXWORD['-'];
    var mp = MXWORD[a.mx.charAt(1)] || MXWORD['-'];
    h += '<div class="rwrow"><span class="dot ' + ma[1] + '"></span><span class="rid" style="min-width:90px">Airframe</span><span class="dims">' + ma[0] + '</span></div>';
    h += '<div class="rwrow"><span class="dot ' + mp[1] + '"></span><span class="rid" style="min-width:90px">Engine</span><span class="dims">' + mp[0] + '</span></div>';
  } else {
    h += '<div class="tiny muted">No repair services on the FAA file for this field.</div>';
  }
  h += '<div class="micro muted" style="margin-top:8px">FAA NASR, Aug 2026 cycle. Crew cars and ramp fees are FBO-level; track those below.</div></div>';

  /* FBOs and crew cars */
  var fboList = (S.fbos[a.c] || []);
  h += '<h2 class="sec">FBOs and crew cars' + (isProUser() ? '' : ' <span class="pill acc">Pro</span>') + '</h2><div class="card" id="fboCard">';
  if (fboList.length) {
    h += fboList.map(function (fb, i) {
      var fid = fb.id || ('f' + i);
      return '<div class="fuelrow">' +
        '<span class="fbo" style="flex:1;font-weight:700">' + esc(fb.name) +
          (fb.note ? '<div class="micro muted" style="font-weight:400">' + esc(fb.note) + '</div>' : '') + '</span>' +
        (fb.car ? '<span class="pill good">Crew car</span>' : '') +
        (fb.mx ? '<span class="pill dim">MX shop</span>' : '') +
        (fb.pending && loggedIn() ? '<span class="pill dim">syncing</span>' : '') +
        '<button class="iconbtn" data-delfbo="' + esc(fid) + '" aria-label="Delete FBO" style="width:30px;height:30px">&#10005;</button>' +
      '</div>';
    }).join('');
  } else {
    h += '<div class="tiny muted">No FBOs tracked yet. Add who is on the field, whether they lend a crew car, and anything worth remembering.</div>';
  }
  if (!canEdit()) {
    h += '<div class="micro muted" style="margin-top:6px">View only for your account.</div>';
  } else if (isProUser()) {
    h += '<hr class="dash">' +
      '<input class="t" id="fbName" placeholder="FBO name" autocomplete="off">' +
      '<div class="btnrow" style="margin-top:8px">' +
        '<button class="btn small" id="fbCar">Crew car</button>' +
        '<button class="btn small" id="fbMx">MX shop</button>' +
      '</div>' +
      '<input class="t" id="fbNote" placeholder="Notes: hours, fees, who hooks you up" autocomplete="off" style="margin-top:8px">' +
      '<div class="btnrow" style="margin-top:8px"><button class="btn" id="fbAdd">Add FBO</button></div>';
  } else {
    h += '<hr class="dash">' + upsellHTML('Track FBOs, crew cars and shop notes, shared with your crew.');
  }
  h += '</div>';

  h += '<h2 class="sec">Jet A price log</h2><div class="card" id="fuelCard">';
  if (loggedIn()) {
    h += '<div style="margin-bottom:8px"><span class="pill good">Synced</span> <span class="tiny muted">Shared with your crew, saved to your account.</span></div>';
  } else {
    h += '<div style="margin-bottom:8px"><span class="pill dim">This phone only</span> <span class="tiny muted">Create a free account to keep prices across devices.</span></div>';
  }
  if (log.length) {
    h += log.map(function (f, i) {
      var d = daysSince(f.date);
      var fid = f.id || ('x' + i);
      return '<div class="fuelrow">' +
        '<span class="p">$' + num(f.price).toFixed(2) + '</span>' +
        '<span class="fbo">' + esc(f.fbo || 'FBO') + '</span>' +
        (f.pending && loggedIn() ? '<span class="pill dim">syncing</span>' : '') +
        (d > 14 ? '<span class="pill warn">STALE</span>' : '') +
        '<span class="d">' + esc(f.date) + '</span>' +
        '<button class="iconbtn" data-delfuel="' + esc(fid) + '" aria-label="Delete price" style="width:30px;height:30px">&#10005;</button>' +
      '</div>';
    }).join('');
  } else {
    h += '<div class="tiny muted">No prices logged. Check AirNav above, then log what you find so it follows the airport.</div>';
  }
  h += canEdit()
    ? '<hr class="dash"><div class="grid3" style="grid-template-columns:1.4fr 1fr auto">' +
      '<input class="t" id="fbIn" placeholder="FBO" autocomplete="off">' +
      '<input class="t mono" id="fpIn" type="number" inputmode="decimal" step="0.01" min="0" placeholder="$/gal">' +
      '<button class="btn" id="fAdd">Log</button>' +
      '</div></div>'
    : '<div class="micro muted" style="margin-top:6px">View only for your account.</div></div>';

  h += '<h2 class="sec">Your notes</h2><div class="card">' +
    '<textarea class="t" id="aptNote" placeholder="Ramp fees, FBO quirks, who hooks you up&hellip;">' + esc(noteVal) + '</textarea>' +
  '</div>';

  h += '<h2 class="sec">Alternates nearby</h2><div class="card">' +
    '<div class="btnrow" id="altRads">' +
      [25, 40, 60].map(function (r) {
        return '<button class="btn small' + (r === altRadius ? ' primary' : '') + '" data-rad="' + r + '">' + r + ' nm</button>';
      }).join('') +
    '</div><div id="altList" style="margin-top:6px"></div>' +
    '<div class="micro muted" style="margin-top:8px">Sometimes 15 minutes over the fence buys a wider runway or cheaper gas.</div>' +
  '</div>';

  h += '<div class="btnrow" style="margin-bottom:14px">' +
    '<button class="btn" id="useAsDest">Fuel calc: land here</button>' +
    '<button class="btn" id="useAsStop">Fuel calc: stop here</button>' +
  '</div>';

  v.innerHTML = h;
  window.scrollTo(0, 0);
  drawRwMap(a);
  renderAlts(a);
  loadAptWx(a);
  loadNotams(a);
  if (!noFetch) {
    pricesFetch().then(function (ok) {
      if (ok && curDetail && curDetail.c === a.c) openApt(a.c, true);
    });
    flushQ(function () { if (curDetail && curDetail.c === a.c && S.q.length === 0) { /* settled */ } });
  }

  $('aptBack').addEventListener('click', closeApt);
  $('fAdd').addEventListener('click', function () {
    var p = num($('fpIn').value, 0);
    if (!p) { $('fpIn').focus(); return; }
    if (!S.fuelLog[a.c]) S.fuelLog[a.c] = [];
    var lid = localId('p');
    var entry = { id: lid, fbo: $('fbIn').value.trim(), price: p, date: today(), pending: true };
    S.fuelLog[a.c].push(entry);
    if (RP.configured !== false) {
      S.q.push({ op: 'add', code: a.c, fbo: entry.fbo, price: entry.price, date: entry.date, lid: lid });
    } else {
      delete entry.pending;
    }
    save();
    openApt(a.c, true);
    flushQ(function () { if (curDetail && curDetail.c === a.c) openApt(a.c, true); });
  });
  /* FBO tracker wiring */
  var fbState = { car: 0, mx: 0 };
  ['fbCar', 'fbMx'].forEach(function (id, idx) {
    var el = $(id);
    if (el) el.addEventListener('click', function () {
      var k = idx === 0 ? 'car' : 'mx';
      fbState[k] = fbState[k] ? 0 : 1;
      el.classList.toggle('primary', !!fbState[k]);
    });
  });
  var fbAddBtn = $('fbAdd');
  if (fbAddBtn) fbAddBtn.addEventListener('click', function () {
    var name = $('fbName').value.trim();
    if (!name) { $('fbName').focus(); return; }
    if (!S.fbos[a.c]) S.fbos[a.c] = [];
    var lid = localId('p');
    var entry = { id: lid, name: name, car: fbState.car, mx: fbState.mx, note: $('fbNote').value.trim(), pending: true };
    S.fbos[a.c].push(entry);
    if (RP.configured !== false) {
      S.q.push({ op: 'fbo_add', code: a.c, name: entry.name, car: entry.car, mx: entry.mx, note: entry.note, lid: lid });
    } else {
      delete entry.pending;
    }
    save();
    openApt(a.c, true);
    flushQ(function () { if (curDetail && curDetail.c === a.c) openApt(a.c, true); });
  });
  v.querySelectorAll('[data-delfbo]').forEach(function (b) {
    b.addEventListener('click', function () {
      var fid = b.dataset.delfbo;
      var list = S.fbos[a.c] || [];
      var entry = null;
      list.forEach(function (e, i) { if ((e.id || ('f' + i)) === fid) entry = e; });
      S.fbos[a.c] = list.filter(function (e, i) { return (e.id || ('f' + i)) !== fid; });
      if (!S.fbos[a.c].length) delete S.fbos[a.c];
      if (entry && entry.pending) {
        S.q = S.q.filter(function (o) { return o.lid !== fid; });
      } else if (entry && entry.id && RP.configured === true) {
        S.q.push({ op: 'fbo_del', code: a.c, id: entry.id });
      }
      save();
      openApt(a.c, true);
      flushQ(function () { if (curDetail && curDetail.c === a.c) openApt(a.c, true); });
    });
  });
  v.querySelectorAll('[data-delfuel]').forEach(function (b) {
    b.addEventListener('click', function () {
      var fid = b.dataset.delfuel;
      var list = S.fuelLog[a.c] || [];
      var entry = null;
      list.forEach(function (e, i) { if ((e.id || ('x' + i)) === fid) entry = e; });
      S.fuelLog[a.c] = list.filter(function (e, i) { return (e.id || ('x' + i)) !== fid; });
      if (!S.fuelLog[a.c].length) delete S.fuelLog[a.c];
      if (entry && entry.pending) {
        S.q = S.q.filter(function (o) { return o.lid !== fid; });
      } else if (entry && entry.id && RP.configured === true) {
        S.q.push({ op: 'del', code: a.c, id: entry.id });
      }
      save();
      openApt(a.c, true);
      flushQ(function () { if (curDetail && curDetail.c === a.c) openApt(a.c, true); });
    });
  });
  var noteT;
  $('aptNote').addEventListener('input', function () {
    clearTimeout(noteT);
    var val = this.value;
    noteT = setTimeout(function () { S.notes[a.c] = val; save(); if (loggedIn()) queueNote(a.c, val); }, 400);
  });
  $('altRads').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rad]'); if (!b) return;
    altRadius = parseInt(b.dataset.rad, 10);
    $('altRads').querySelectorAll('button').forEach(function (x) { x.classList.toggle('primary', x === b); });
    renderAlts(a);
  });
  $('useAsDest').addEventListener('click', function () { S.fs.aptA = a.c; syncFsPrices('A'); save(); showTab('fuel'); });
  $('useAsStop').addEventListener('click', function () { S.fs.aptB = a.c; syncFsPrices('B'); save(); showTab('fuel'); });
}
function closeApt() {
  curDetail = null;
  $('aptDetailView').style.display = 'none';
  $('aptSearchView').style.display = 'block';
}
function renderAlts(a) {
  var list = [];
  for (var i = 0; i < AP.length; i++) {
    var b = AP[i];
    if (b.c === a.c) continue;
    var dLa = Math.abs(b.la - a.la), dLo = Math.abs(b.lo - a.lo);
    if (dLa > 1.6 || dLo > 2.2) continue; // cheap prefilter
    var d = hav(a, b);
    if (d <= altRadius) list.push([d, b]);
  }
  list.sort(function (x, y) { return x[0] - y[0]; });
  list = list.slice(0, 14);
  $('altList').innerHTML = list.map(function (p) {
    var d = p[0], b = p[1], br = bestRw(b), t = br ? rTier(br) : 2;
    var min = d / Math.max(60, S.settings.ktas) * 60;
    return '<button class="alt" style="width:100%;text-align:left;background:none;border:none;border-bottom:1px dashed var(--line);padding:9px 0;color:inherit;font:inherit;display:flex" data-apt="' + esc(b.c) + '">' +
      '<span class="dot ' + TIER[t].cls + '" style="margin-top:6px"></span>' +
      '<span class="code">' + esc(b.c) + '</span>' +
      '<span class="info">' + esc(b.n) + (br ? ' · <span class="mono">' + fmtNum(br.l) + '&times;' + fmtNum(br.w) + '</span>' + (br.lit ? '' : ' · UNLIT') : '') +
        (b.fu && !hasJetA(b) ? ' · <span style="color:var(--bad)">no Jet A</span>' : '') + '</span>' +
      '<span class="dist mono">' + fmtNm(d) + ' nm<br>&#8776;' + Math.round(min) + ' min</span>' +
    '</button>';
  }).join('') || '<div class="tiny muted" style="padding:8px 0">Nothing inside ' + altRadius + ' nm.</div>';
  $('altList').querySelectorAll('[data-apt]').forEach(function (b) {
    b.addEventListener('click', function () { openApt(b.dataset.apt); });
  });
}

/* runway plan-view diagram */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function drawRwMap(a) {
  var cv = $('rwMap'); if (!cv) return;
  var dpr = window.devicePixelRatio || 1;
  var W = cv.clientWidth || 320, H = cv.clientHeight || 190;
  cv.width = W * dpr; cv.height = H * dpr;
  var ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  var ink = cssVar('--ink'), ink3 = cssVar('--ink3'), card2 = cssVar('--card2'), acc = cssVar('--acc');
  var rws = (a.r || []).filter(function (r) { return r.l > 0; });
  if (!rws.length) return;
  var maxL = Math.max.apply(null, rws.map(function (r) { return r.l; }));
  var scale = Math.min(W, H) * 0.82 / maxL;
  var cx = W / 2, cy = H / 2;
  /* north arrow */
  ctx.strokeStyle = ink3; ctx.fillStyle = ink3; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W - 20, 30); ctx.lineTo(W - 20, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 20, 12); ctx.lineTo(W - 24, 20); ctx.lineTo(W - 16, 20); ctx.closePath(); ctx.fill();
  ctx.font = '9px ' + cssVar('--mono').split(',')[0].replace(/'/g, '') + ', monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', W - 20, 41);
  rws.forEach(function (r) {
    var numHd = parseInt((r.id.split('/')[0] || '').replace(/[LRC]/g, ''), 10);
    var hd = isFinite(numHd) ? numHd * 10 : 90;
    var ang = (hd - 90) * Math.PI / 180; /* canvas: 0 = east; heading 0 = north */
    var len = r.l * scale;
    var wid = Math.max(4, Math.min(16, r.w * scale * 2.6));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(-len / 2, -wid / 2, len, wid);
    /* centerline */
    if (wid >= 7) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = card2;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(-len / 2 + 8, 0); ctx.lineTo(len / 2 - 8, 0); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    /* end labels */
    var ends = r.id.split('/');
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var lx = cx - dx * (len / 2 + 14), ly = cy - dy * (len / 2 + 14);
    var hx = cx + dx * (len / 2 + 14), hy = cy + dy * (len / 2 + 14);
    ctx.fillStyle = acc; ctx.globalAlpha = 1;
    ctx.font = '700 10px ' + '"B612 Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (ends[0]) ctx.fillText(ends[0], lx, ly);
    if (ends[1]) ctx.fillText(ends[1], hx, hy);
  });
  /* scale note */
  ctx.fillStyle = ink3;
  ctx.font = '9px "B612 Mono", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('to scale · width exaggerated', 10, H - 10);
}

/* ================= FUEL STOP TAB ================= */
function latestPrice(code) {
  var a = lookup(code); if (!a) return null;
  var log = S.fuelLog[a.c];
  if (!log || !log.length) return null;
  var best = log[0];
  log.forEach(function (f) { if (f.date > best.date) best = f; });
  return best;
}
function syncFsPrices(which) {
  var fs = S.fs;
  if (which !== 'B') { var pa = latestPrice(fs.aptA); if (pa) fs.priceA = pa.price; }
  if (which !== 'A') { var pb = latestPrice(fs.aptB); if (pb) fs.priceB = pb.price; }
}
function renderFuel() {
  var lock = $('fuelLock');
  if (!loggedIn()) {
    lock.style.display = 'block';
    lock.innerHTML = lockedHTML('The fuel-stop calculator: is the cheap stop worth an extra takeoff and landing, in dollars.');
    $('fuelForm').style.display = 'none'; $('fsOut').innerHTML = ''; $('fsAssume').textContent = ''; $('mkSlot').innerHTML = '';
    return;
  }
  lock.style.display = 'none'; $('fuelForm').style.display = '';
  (function () {
    var rf = S.rf || {}, t = trip();
    var from = rf.from || (t && t.legs.length ? t.legs[0].from : (S.settings.homeBase || ''));
    var to = rf.to || (t && t.legs.length ? t.legs[t.legs.length - 1].to : '');
    if (!$('rfFrom').value) $('rfFrom').value = from || '';
    if (!$('rfTo').value) $('rfTo').value = to || '';
    if (rf.corr) $('rfCorr').value = String(rf.corr);
    if (!isProUser()) $('rfOut').innerHTML = upsellHTML('Rank every Jet A field along your route by what the stop actually saves.');
  })();
  pricesFetch().then(function (ok) { if (ok) computeFuel(); });
  renderMarket();
  var fs = S.fs, st = S.settings;
  $('fsAptA').value = fs.aptA || '';
  $('fsPriceA').value = fs.priceA === '' ? '' : num(fs.priceA).toFixed(2);
  $('fsAptB').value = fs.aptB || '';
  $('fsPriceB').value = fs.priceB === '' ? '' : num(fs.priceB).toFixed(2);
  $('fsGal').value = fs.gal;
  $('fsDetour').value = fs.detour;
  $('fsRamp').value = fs.ramp;
  computeFuel();
}
function computeFuel() {
  var fs = S.fs, st = S.settings;
  var A = lookup(fs.aptA), B = lookup(fs.aptB);
  var hint = [];
  if (A) {
    var la = latestPrice(fs.aptA);
    hint.push(esc(A.c) + ' = ' + esc(A.n) + (la ? ' (logged $' + num(la.price).toFixed(2) + ' ' + esc(la.date) + ')' : ''));
  }
  if (B) {
    var lb = latestPrice(fs.aptB);
    hint.push(esc(B.c) + ' = ' + esc(B.n) + (lb ? ' (logged $' + num(lb.price).toFixed(2) + ' ' + esc(lb.date) + ')' : ''));
  }
  if (A && B) hint.push('Direct ' + esc(A.c) + '&#8594;' + esc(B.c) + ' &#8776; ' + fmtNm(hav(A, B)) + ' nm');
  if (B && B.fu && !hasJetA(B)) hint.push('<span style="color:var(--bad)">' + esc(B.c) + ' has no Jet A on the FAA file</span>');
  $('fsHint').innerHTML = hint.join(' · ');

  var pA = num(fs.priceA, 0), pB = num(fs.priceB, 0), gal = num(fs.gal, 0);
  var out = $('fsOut');
  if (!pA || !pB || !gal) {
    out.innerHTML = '<div class="empty">Enter both prices and the gallons you need. ' +
      'Check current numbers on AirNav (links on any airport page), log them, and this fills itself in.</div>';
    $('fsAssume').textContent = '';
    return;
  }
  var detour = num(fs.detour, 0), ramp = num(fs.ramp, 0);
  var extraBurn = num(st.stopGal, 15) + detour / 60 * num(st.gph, 40);
  var savings = gal * (pA - pB);
  var burnCost = extraBurn * pB;
  var net = savings - burnCost - ramp;
  var breakeven = gal > 0 ? (burnCost + ramp) / gal : 0;
  var timeAdd = detour + num(st.groundStopMin, 25);
  var win = net > 0;

  out.innerHTML =
    '<div class="verdict ' + (win ? 'save' : 'skip') + '">' +
      '<div class="vword">' + (win ? 'Worth the stop' : 'Skip it, tanker on') + '</div>' +
      '<div class="vnum">' + (win ? '+' : '&#8722;') + fmtMoney(Math.abs(net)).replace('$', '$') + '</div>' +
      '<div class="vsub">' + (win ? 'net saved buying ' + fmtNum(gal) + ' gal at the stop' : 'net cost of making the stop for ' + fmtNum(gal) + ' gal') + '</div>' +
    '</div>' +
    '<div class="card" style="margin-top:10px">' +
      '<div class="bk plus"><span>Price gap &times; ' + fmtNum(gal) + ' gal ($' + (pA - pB).toFixed(2) + '/gal)</span><span class="v">+' + fmtMoney(savings) + '</span></div>' +
      '<div class="bk minus"><span>Extra burn: stop cycle ' + fmtNum(num(st.stopGal, 15)) + ' gal + detour ' + fmtNum(detour / 60 * num(st.gph, 40)) + ' gal</span><span class="v">&#8722;' + fmtMoney(burnCost) + '</span></div>' +
      (ramp ? '<div class="bk minus"><span>Ramp fee at the stop</span><span class="v">&#8722;' + fmtMoney(ramp) + '</span></div>' : '') +
      '<div class="bk"><span>Breaks even at a price gap of</span><span class="v">$' + breakeven.toFixed(2) + '/gal</span></div>' +
      '<div class="bk"><span>Time added (detour + ground)</span><span class="v">' + fmtMin(timeAdd) + '</span></div>' +
    '</div>';
  $('fsAssume').textContent = 'Assumes ' + st.gph + ' gph and ' + st.stopGal +
    ' gal per extra takeoff and landing cycle, ' + st.groundStopMin + ' min on the ground. Tune in Settings.';
}
[['fsAptA', 'aptA'], ['fsAptB', 'aptB'], ['fsPriceA', 'priceA'], ['fsPriceB', 'priceB'],
 ['fsGal', 'gal'], ['fsDetour', 'detour'], ['fsRamp', 'ramp']].forEach(function (p) {
  var el = $(p[0]);
  el.addEventListener('input', function () {
    S.fs[p[1]] = el.value;
    if (p[1] === 'aptA') syncFsPrices('A');
    if (p[1] === 'aptB') syncFsPrices('B');
    if (p[1] === 'aptA' || p[1] === 'aptB') {
      $('fsPriceA').value = S.fs.priceA === '' ? '' : num(S.fs.priceA).toFixed(2);
      $('fsPriceB').value = S.fs.priceB === '' ? '' : num(S.fs.priceB).toFixed(2);
    }
    save(); computeFuel();
  });
});

/* ---------- route fuel stop finder ---------- */
function crossTrack(A, B, C) {
  /* returns { xt: nm off the great circle A->B (abs), at: along-track fraction 0..1 } */
  var R = 3440.065, r = Math.PI / 180;
  var d13 = hav(A, C) / R, t13 = bearing(A, C) * r, t12 = bearing(A, B) * r;
  var xt = Math.asin(Math.sin(d13) * Math.sin(t13 - t12));
  var at = Math.acos(Math.max(-1, Math.min(1, Math.cos(d13) / Math.max(1e-9, Math.cos(xt)))));
  var d12 = hav(A, B) / R;
  var sign = Math.cos(t13 - t12) < 0 ? -1 : 1;
  return { xt: Math.abs(xt) * R, at: d12 > 0 ? sign * at / d12 : 0 };
}
function routeStops(A, B, corridor) {
  var st = S.settings, gal = num(S.fs.gal, 0) || 100;
  var pDestRec = latestPrice(B.c);
  var pDest = pDestRec ? num(pDestRec.price) : (S.fs.aptA && lookup(S.fs.aptA) === B && num(S.fs.priceA) ? num(S.fs.priceA) : num(st.price));
  var direct = hav(A, B);
  var out = [];
  AP.forEach(function (C) {
    if (C === A || C === B || !hasJetA(C) || aptTier(C) > 1) return;
    var ct = crossTrack(A, B, C);
    if (ct.xt > corridor || ct.at < -0.05 || ct.at > 1.05) return;
    var detourNm = hav(A, C) + hav(C, B) - direct;
    var detourMin = detourNm / Math.max(60, num(st.ktas)) * 60;
    var rec = latestPrice(C.c);
    var price = rec ? num(rec.price) : null;
    var extraBurn = num(st.stopGal, 15) + detourMin / 60 * num(st.gph, 40);
    var net = price != null ? gal * (pDest - price) - extraBurn * price : null;
    out.push({ a: C, xt: ct.xt, detourNm: detourNm, detourMin: detourMin, price: price, date: rec ? rec.date : null, net: net, extraBurn: extraBurn });
  });
  out.sort(function (x, y) {
    if (x.net != null && y.net != null) return y.net - x.net;
    if (x.net != null) return -1; if (y.net != null) return 1;
    return x.detourMin - y.detourMin;
  });
  return { list: out.slice(0, 10), pDest: pDest, pDestKnown: !!pDestRec, gal: gal, direct: direct };
}
function renderRouteStops() {
  var out = $('rfOut'); if (!out) return;
  if (!isProUser()) { out.innerHTML = upsellHTML('Rank every Jet A field along your route by what the stop actually saves.'); return; }
  var A = lookup($('rfFrom').value), B = lookup($('rfTo').value);
  if (!A || !B) { out.innerHTML = '<div class="tiny muted">Enter both airports from the database.</div>'; return; }
  if (A === B) { out.innerHTML = '<div class="tiny muted">Pick two different airports.</div>'; return; }
  var corr = num($('rfCorr').value, 30);
  var r = routeStops(A, B, corr);
  S.rf = { from: A.c, to: B.c, corr: corr }; save();
  if (!r.list.length) { out.innerHTML = '<div class="tiny muted">No Jet A field with a 4,000 ft runway within ' + corr + ' nm of ' + esc(A.c) + ' to ' + esc(B.c) + '. Widen the corridor.</div>'; return; }
  var h = '<div class="micro muted" style="margin-bottom:6px">' + esc(A.c) + ' &#8594; ' + esc(B.c) + ' direct ' + fmtNm(r.direct) + ' nm · ' + fmtNum(r.gal) + ' gal · destination ' +
    (r.pDestKnown ? 'logged at $' + r.pDest.toFixed(2) : 'assumed $' + r.pDest.toFixed(2) + ' (planning price; log the real one on its airport page)') + '</div>';
  h += r.list.map(function (x) {
    var netTxt = x.net == null ? '<span class="pill dim">no price yet</span>'
      : '<span class="pill ' + (x.net > 0 ? 'good' : 'bad') + '">' + (x.net > 0 ? '+' : '&#8722;') + fmtMoney(Math.abs(x.net)) + '</span>';
    return '<div class="rfrow">' +
      '<div class="spread"><div style="min-width:0"><b class="mono">' + esc(x.a.c) + '</b> <span class="tiny muted">' + esc(x.a.n.replace(/ Airport$/, '')) + ', ' + esc(x.a.st) + '</span></div>' + netTxt + '</div>' +
      '<div class="micro muted mono" style="margin-top:2px">' + fmtNm(x.xt) + ' nm off route · +' + fmtMin(x.detourMin + num(S.settings.groundStopMin, 25)) + ' with the stop' +
        (x.price != null ? ' · $' + x.price.toFixed(2) + ' ' + esc(x.date || '') : '') + (x.a.fee ? ' · landing fee' : '') + '</div>' +
      '<div class="btnrow" style="margin-top:6px">' +
        '<button class="btn small" data-rfuse="' + esc(x.a.c) + '" data-rfmin="' + Math.round(x.detourMin) + '">Use in calculator</button>' +
        '<button class="btn small ghost" data-openapt="' + esc(x.a.c) + '">Open airport</button>' +
      '</div>' +
    '</div>';
  }).join('');
  h += '<div class="micro muted" style="margin-top:8px">Net = price gap &times; gallons, minus the extra burn for the stop cycle and detour at the stop\'s price. Ramp fees are not included; tap Use and add one.</div>';
  out.innerHTML = h;
  out.querySelectorAll('[data-rfuse]').forEach(function (b) {
    b.addEventListener('click', function () {
      var C = lookup(b.dataset.rfuse); if (!C) return;
      var rec = latestPrice(C.c);
      S.fs.aptA = B.c; S.fs.priceA = r.pDest; S.fs.aptB = C.c; S.fs.priceB = rec ? num(rec.price) : ''; S.fs.detour = num(b.dataset.rfmin, 0); S.fs.gal = r.gal;
      save(); renderFuel();
      var el = $('fsAptA'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!rec) showToast('No price logged at ' + C.c + ' yet. Enter one to score it.');
    });
  });
}
(function wireRoute() {
  var go = $('rfGo'); if (!go) return;
  go.addEventListener('click', renderRouteStops);
  ['rfFrom', 'rfTo'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') renderRouteStops(); }); });
})();

/* ================= SETTINGS SHEET ================= */
var sheetReturnFocus = null;
function openSheet() {
  sheetReturnFocus = document.activeElement;
  var st = S.settings;
  var f = function (id, lab, val, step) {
    return '<label class="f"><span class="lab">' + lab + '</span>' +
      '<input class="t mono" id="' + id + '" type="number" inputmode="decimal" step="' + (step || 1) + '" value="' + esc(String(val)) + '"></label>';
  };
  ensureProfiles();
  var chips = S.profiles.map(function (p, i) {
    return '<button class="tchip' + (i === S.activeProfile ? ' on' : '') + '" data-prof="' + i + '">' + esc(profileLabel(p)) + '</button>';
  }).join('') + '<button class="tchip" data-prof="new">+ Add airplane</button>';
  $('sheetBody').innerHTML =
    '<div class="grab"></div>' +
    '<h2 class="sec" style="margin-top:0">Your airplane' + (S.profiles.length > 1 ? 's' : '') + '</h2>' +
    '<div class="tripchips" style="margin-bottom:8px">' + chips + '</div>' +
    '<div class="grid2">' +
      '<label class="f"><span class="lab">Type</span><select class="t" id="stPreset">' +
        '<option value="">' + esc(st.acType || 'Custom') + '</option>' +
        PRESETS.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.name) + ' preset</option>'; }).join('') +
      '</select></label>' +
      '<label class="f"><span class="lab">Tail number</span><input class="t mono" id="stTail" autocapitalize="characters" placeholder="N123XX" value="' + esc(st.tail || '') + '"></label>' +
    '</div>' +
    '<div class="micro muted" style="margin:-4px 2px 8px">Pick a preset to load book numbers, then tune them to your airplane.</div>' +
    '<div class="grid2">' + f('stKtas', 'Cruise KTAS', st.ktas) + f('stGph', 'Cruise GPH', st.gph) + '</div>' +
    '<div class="grid2">' + f('stCrz', 'Cruise alt ft', st.crzAlt, 1000) + f('stTaxi', 'Taxi + TO gal / leg', st.taxiGal) + '</div>' +
    '<div class="grid2">' + f('stOver', 'Block overhead min / leg', st.blockOverheadMin) +
      '<label class="f"><span class="lab">Home base</span><input class="t mono" id="stHome" autocapitalize="characters" value="' + esc(st.homeBase || '') + '"></label>' + '</div>' +
    '<h2 class="sec">Runway numbers (POH, sea level, ISA, max weight)</h2>' +
    '<div class="grid2">' + f('stToSL', 'Takeoff over 50 ft, ft', st.toSL, 10) + f('stLdgSL', 'Landing over 50 ft, ft', st.ldgSL, 10) + '</div>' +
    '<div class="micro muted" style="margin:-4px 2px 8px">Used for the runway estimates on airport pages. Rules of thumb scale them for density altitude and wind; the POH is the authority.</div>' +
    (S.profiles.length > 1 ? '<div class="btnrow" style="margin-bottom:6px"><button class="btn small danger" id="stRemove">Remove this airplane</button></div>' : '') +
    '<h2 class="sec">Fuel stop model</h2>' +
    '<div class="grid2">' + f('stStopGal', 'Extra gal / stop cycle', st.stopGal) + f('stGround', 'Ground stop min', st.groundStopMin) + '</div>' +
    f('stPrice', 'Planning $/gal', num(st.price).toFixed(2), '0.05') +
    '<h2 class="sec">Backup</h2>' +
    '<div class="tiny muted" style="margin-bottom:8px">' + (loggedIn() ? 'Your trips, prices and notes are saved to your account. This is a local extra copy.' : 'Without an account, everything lives on this phone. Copy this text somewhere safe; paste it back to restore.') + '</div>' +
    '<textarea class="t mono" id="bkArea" style="font-size:12px"></textarea>' +
    '<div class="btnrow" style="margin-top:8px">' +
      '<button class="btn small" id="bkOut">Show backup</button>' +
      '<button class="btn small" id="bkCopy">Copy</button>' +
      '<button class="btn small danger" id="bkIn">Restore from box</button>' +
    '</div>' +
    '<div class="notice" style="margin-top:14px"><b>Planning aid only.</b> Estimates use your numbers above. ' +
    'Always verify fuel prices, weather, NOTAMs, and performance with official sources and your POH before flight.</div>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn primary" id="sheetDone" style="flex:1">Done</button></div>';
  $('sheetWrap').classList.add('on');
  $('sheetWrap').setAttribute('aria-hidden', 'false');
  setPageInert(true);
  setTimeout(function () { var f = $('sheetBody').querySelector('input,select,textarea,button'); if (f) f.focus(); }, 0);

  $('sheetDone').addEventListener('click', closeSheet);
  $('stPreset').addEventListener('change', function () {
    var v = $('stPreset').value; if (!v) return;
    readSheetInto(S.settings); applyPreset(v); openSheet();
  });
  $('sheetBody').querySelectorAll('[data-prof]').forEach(function (b) {
    b.addEventListener('click', function () {
      readSheetInto(S.settings); saveActiveProfile();
      if (b.dataset.prof === 'new') {
        var np = profileFromSettings(); np.tail = ''; np.acType = 'New airplane';
        S.profiles.push(np); useProfile(S.profiles.length - 1);
      } else useProfile(parseInt(b.dataset.prof, 10));
      openSheet(); renderAll();
    });
  });
  var rmp = $('stRemove');
  if (rmp) rmp.addEventListener('click', function () {
    if (S.profiles.length < 2) return;
    S.profiles.splice(S.activeProfile, 1); S.activeProfile = 0;
    var p = S.profiles[0]; PROFILE_KEYS.forEach(function (k) { if (p[k] !== undefined) S.settings[k] = p[k]; });
    save(); openSheet(); renderAll();
  });
  $('bkOut').addEventListener('click', function () { $('bkArea').value = JSON.stringify(S); });
  $('bkCopy').addEventListener('click', function () {
    if (!$('bkArea').value) $('bkArea').value = JSON.stringify(S);
    $('bkArea').select();
    try { document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard) { navigator.clipboard.writeText($('bkArea').value).catch(function () {}); }
    $('bkCopy').textContent = 'Copied';
    setTimeout(function () { if ($('bkCopy')) $('bkCopy').textContent = 'Copy'; }, 1800);
  });
  $('bkIn').addEventListener('click', function () {
    var b = $('bkIn');
    if (!b.dataset.armed) {
      b.dataset.armed = '1'; b.textContent = 'Replace everything?';
      setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Restore from box'; } }, 3000);
      return;
    }
    try {
      var next = JSON.parse($('bkArea').value);
      if (next && next.settings && next.trips) { S = next; save(); closeSheet(); applyTheme(); renderAll(); }
      else { b.textContent = 'Not a valid backup'; }
    } catch (e) { b.textContent = 'Not a valid backup'; }
  });
}
function readSheetInto(st) {
  var g = function (id) { var el = $(id); return el ? el.value : null; };
  if (!$('stTail')) return false;
  st.tail = g('stTail').trim().toUpperCase();
  st.homeBase = g('stHome').trim().toUpperCase();
  st.ktas = Math.max(60, num(g('stKtas'), st.ktas));
  st.gph = Math.max(1, num(g('stGph'), st.gph));
  st.crzAlt = Math.min(51000, Math.max(2000, num(g('stCrz'), st.crzAlt)));
  st.taxiGal = Math.max(0, num(g('stTaxi'), st.taxiGal));
  st.blockOverheadMin = Math.max(0, num(g('stOver'), st.blockOverheadMin));
  st.stopGal = Math.max(0, num(g('stStopGal'), st.stopGal));
  st.groundStopMin = Math.max(0, num(g('stGround'), st.groundStopMin));
  st.price = Math.max(0, num(g('stPrice'), st.price));
  st.toSL = Math.max(500, num(g('stToSL'), st.toSL));
  st.ldgSL = Math.max(500, num(g('stLdgSL'), st.ldgSL));
  return true;
}
function closeSheet() {
  var st = S.settings;
  if (readSheetInto(st)) {
    saveActiveProfile();
    if (loggedIn() && AUTH.me.user && (st.tail !== AUTH.me.user.tail || st.homeBase !== AUTH.me.user.home_base)) {
      api('/api/me', { body: { tail: st.tail, home_base: st.homeBase } }).then(function (r) { if (r.ok) AUTH.me = r.data; });
    }
  }
  save();
  $('sheetWrap').classList.remove('on');
  $('sheetWrap').setAttribute('aria-hidden', 'true');
  setPageInert(false);
  renderSub(); renderAll();
  flushQ(function () { if (curDetail) openApt(curDetail.c, true); });
  if (sheetReturnFocus && sheetReturnFocus.isConnected) sheetReturnFocus.focus();
  sheetReturnFocus = null;
}
$('setBtn').addEventListener('click', openSheet);
$('sheetScrim').addEventListener('click', closeSheet);
$('modalScrim').addEventListener('click', closeModal);
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if ($('modalWrap').classList.contains('on')) closeModal();
  else if ($('sheetWrap').classList.contains('on')) closeSheet();
});

/* ---------- boot ---------- */
function renderAll() {
  renderSub();
  renderTrip();
  renderFuel();
  if (curTab === 'account') renderAccount();
  if (curDetail) openApt(curDetail.c);
}
var rszT;
window.addEventListener('resize', function () {
  clearTimeout(rszT);
  rszT = setTimeout(function () { if (curDetail) drawRwMap(curDetail); }, 200);
});

/* ================= WELCOME (landing) ================= */
function renderWelcome() {
  var p = (AUTH.me && AUTH.me.prices) || { monthly: 9.99, annual: 79 };
  var savePct = Math.round((1 - p.annual / (p.monthly * 12)) * 100);
  var annualSave = Math.max(0, p.monthly * 12 - p.annual).toFixed(2);
  var pill = function (cls, t) { return '<span class="pill ' + cls + '">' + t + '</span>'; };
  var mono = function (t, extra) { return '<span class="mono" style="' + (extra || '') + '">' + t + '</span>'; };
  var phone =
    '<div class="phone" aria-hidden="true">' +
      '<div class="row" style="padding:4px 6px 0"><span style="font-family:var(--wordmark);font-size:11px;letter-spacing:.08em">JETDESK</span>' + pill('acc', 'Fuel stop') + '</div>' +
      '<div class="pcard">' +
        '<div class="grid2" style="gap:8px"><div class="pfield"><div class="l">Land at</div><div class="v">KHPN · $9.40</div></div><div class="pfield"><div class="l">Stop at</div><div class="v">KBDR · $7.10</div></div></div>' +
        '<div class="grid3" style="gap:8px"><div class="pfield"><div class="l">Gallons</div><div class="v">150</div></div><div class="pfield"><div class="l">Detour</div><div class="v">10 min</div></div><div class="pfield"><div class="l">Ramp</div><div class="v">$0</div></div></div>' +
      '</div>' +
      '<div class="pverdict"><div class="w">WORTH THE STOP</div><div class="n">+$191</div><div class="micro muted">net after the extra landing, takeoff and detour</div></div>' +
      '<div class="pcard" style="font-size:12px">' +
        '<div class="row"><span class="muted">Price gap × 150 gal ($2.30)</span>' + mono('+$345', 'color:var(--good);font-weight:700') + '</div>' +
        '<div class="row"><span class="muted">Stop cycle 15 gal + detour 7 gal</span>' + mono('&#8722;$154', 'color:var(--bad);font-weight:700') + '</div>' +
        '<div class="row"><span class="muted">Breaks even at a gap of</span>' + mono('$1.03/gal', 'font-weight:700') + '</div>' +
        '<div class="row"><span class="muted">Time added</span>' + mono('35 min', 'font-weight:700') + '</div>' +
      '</div>' +
    '</div>';

  var h =
    '<div class="landing">' +
    '<section class="hero">' +
      '<picture class="hero-media" aria-hidden="true"><source media="(max-width:640px)" srcset="/img/hero-blue-hour.a3a1bd3d-800.webp"><img class="heroart" src="/img/hero-blue-hour.a3a1bd3d.webp" alt="" width="1600" height="900" fetchpriority="high" decoding="async"></picture>' +
      '<div class="herowrap">' +
      '<div>' +
        '<div class="eyebrow">For pilots who manage the airplane</div>' +
        '<h1 class="herotitle">Know what the trip costs <span class="ion">before you file.</span></h1>' +
        '<p class="herosub">Live FAA weather, winds aloft, runway verdicts, fuel-stop math and your crew\'s FBO intel on one screen. So the calls you make on the ramp are made with numbers, not memory.</p>' +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary" data-auth="register" style="min-height:50px;padding:0 20px;font-size:15px">Start planning free</button>' +
          '<button class="btn" id="browseBtn" style="min-height:50px">Explore airport data</button>' +
        '</div>' +
        '<div class="hero-proof"><span>No credit card</span><span>14-day Pro trial</span><span>Works offline</span></div>' +
        '<button class="linkbtn" id="seeSavings">See the +$191 fuel-stop math &#8595;</button>' +
      '</div>' +
      phone +
    '</div></section>' +

    '<div class="strip"><span class="k">Built on official data</span><span class="s">FAA Aviation Weather Center</span><span class="s">FAA NASR airport file</span><span class="s">FAA winds aloft</span><span class="s">U.S. EIA</span><span class="s">OilPriceAPI</span></div>' +

    '<section id="savings"><h2 class="sec">Where the money is</h2>' +
      '<div class="landing-heading">The spread between two FBOs is bigger than the spread between two airlines.</div>' +
      '<p class="muted" style="margin:0 2px 14px;font-size:15px;line-height:1.55;max-width:46em">Jet A at the FBO the owner likes can run two dollars a gallon over the field twenty minutes away. On a 150-gallon load that is $345 before you count what the extra landing costs. JetDesk counts it: every stop is scored against its own burn, detour and ramp fee, and the answer is a number with a sign in front of it.</p>' +
      '<div class="stats">' +
        '<div class="card stat2"><div class="n">$2.30</div><div class="t">per gallon, 27 nm apart</div><div class="d">Sample spread between a premium FBO and the field down the coast, same day.</div></div>' +
        '<div class="card stat2"><div class="n" style="color:var(--good)">+$191</div><div class="t">net on one stop</div><div class="d">After the extra takeoff, landing, detour minutes and ramp fee are charged against it.</div></div>' +
        '<div class="card stat2"><div class="n" style="color:var(--ink)">42<span class="tiny muted"> vs </span>35</div><div class="t">minutes, out and back</div><div class="d">Same 110 nm leg with forecast winds applied. The owner\'s ETA stops being a guess.</div></div>' +
        '<div class="card stat2"><div class="n" style="color:var(--ink)">4<span class="tiny muted"> tabs </span>&#8594;<span class="tiny muted"> </span>1</div><div class="t">screen before you file</div><div class="d">AirNav, the weather site, the notes app and the owner text thread, on one page per airport.</div></div>' +
      '</div>' +
    '</section>' +

    '<section><h2 class="sec">What it does</h2><div class="caps">' +
      '<div class="card cap"><div class="demo">' +
        '<div class="row">' + mono('KMVY', 'font-weight:700;font-size:15px') + pill('good', 'Wide open') + '</div>' +
        '<svg viewBox="0 0 260 96" width="100%" height="96" fill="none"><g transform="translate(130 48)"><rect x="-92" y="-6" width="184" height="12" fill="var(--ink2)" transform="rotate(-30)"/><rect x="-52" y="-4" width="104" height="8" fill="var(--ink3)" transform="rotate(60)"/><text x="-122" y="40" fill="var(--acc)" font-family="B612 Mono,monospace" font-size="11" font-weight="700">06</text><text x="92" y="-30" fill="var(--acc)" font-family="B612 Mono,monospace" font-size="11" font-weight="700">24</text></g></svg>' +
        '<div class="row">' + mono('06/24 · 5,504 × 100') + pill('dim', 'Lit') + '</div><div class="row">' + mono('15/33 · 3,327 × 75') + pill('bad', 'Tight') + '</div>' +
      '</div><div class="ct">Runway verdicts, to scale</div><div class="cd">Every runway drawn from FAA geometry and graded wide open, workable or tight. Unlit fields flagged before an 11 p.m. arrival, not during one.</div></div>' +

      '<div class="card cap"><div class="demo">' +
        '<div class="row">' + mono('KHPN <span style="color:var(--acc)">&#9656;</span> KPVD', 'font-weight:700;font-size:15px') + pill('acc', 'FL260') + '</div>' +
        '<div class="legstats"><span class="stat"><span class="n">110</span><span class="u">nm</span></span><span class="stat"><span class="n">35</span><span class="u">min</span></span><span class="stat"><span class="n">292</span><span class="u">kt GS</span></span><span class="stat"><span class="n">28</span><span class="u">gal</span></span></div>' +
        '<div class="micro muted">winds aloft 300/58 at FL260 (BDL)</div>' +
        '<div class="row" style="background:var(--card);border-radius:10px;padding:8px 10px">' + mono('05/23 · 8,700 × 150 · LIT', 'font-size:11px') + pill('vfr', 'VFR') + '</div>' +
      '</div><div class="ct">Legs that know the wind</div><div class="cd">FAA winds aloft at your cruise altitude give each leg its real groundspeed, block time, burn and cost. Out and back stop looking identical.</div></div>' +

      '<div class="card cap"><div class="demo">' +
        '<div class="wxline">' + pill('vfr', 'VFR') + mono('14009KT 10+ SM', 'font-weight:700') + mono('25/14 A3012', 'color:var(--ink2)') + '</div>' +
        '<div class="lab" style="margin:2px 0 0">Runway winds now · <span style="color:var(--acc)">best: 16</span></div>' +
        '<div class="row">' + mono('<span class="dot good"></span> 16 · 9 kt head · 0 cross') + mono('6,081×150', 'color:var(--ink3)') + '</div>' +
        '<div class="row">' + mono('<span class="dot good"></span> 23 · 3 kt head · 9L cross') + mono('8,700×150', 'color:var(--ink3)') + '</div>' +
        '<div class="micro muted">Field 55 ft · density altitude 1,320 ft</div>' +
      '</div><div class="ct">Live weather with a runway pick</div><div class="cd">METAR and TAF on every airport and arrival, head and crosswind per runway from the live wind, density altitude, and the best runway right now.</div></div>' +

      '<div class="card cap"><div class="demo">' +
        '<div class="micro muted">Around your position · Jet A only</div>' +
        '<div class="row">' + mono('<span class="dot good"></span> KLGA · 7,002×150') + mono('18.9 nm · 203°', 'color:var(--ink3)') + '</div>' +
        '<div class="row">' + mono('<span class="dot good"></span> KTEB · 6,997×150') + mono('20.6 nm · 231°', 'color:var(--ink3)') + '</div>' +
        '<div class="row">' + mono('<span class="dot warn"></span> KDXR · 4,421×150') + mono('20.9 nm · 029°', 'color:var(--ink3)') + '</div>' +
        '<div class="row">' + mono('<span class="dot good"></span> KFRG · 6,833×150') + mono('24.3 nm · 147°', 'color:var(--ink3)') + '</div>' +
      '</div><div class="ct">Near Me, with no bars</div><div class="cd">GPS-sorted fields with distance and bearing, filtered to Jet A or big runways. The database rides on the phone, so it works where the signal does not.</div></div>' +

      '<div class="card cap"><div class="demo">' +
        '<div class="row"><b>Signature East</b>' + pill('good', 'Crew car') + '</div><div class="micro muted">Crew car 2 h max, ask for Tony</div>' +
        '<div class="row"><b>Million Air</b>' + pill('warn', '+$2/gal') + '</div><div class="micro muted">Owner\'s pick, he gets the car service. Tanker where it\'s cheap.</div>' +
        '<div class="row" style="border-top:1px dashed var(--line2);padding-top:8px">' + mono('$7.10', 'font-weight:700') + '<span class="muted">Sikorsky self-serve</span>' + mono('Sep 1', 'color:var(--ink3)') + '</div>' +
      '</div><div class="ct">Crew intel that follows the airport</div><div class="cd">Prices, FBOs, crew cars, fees and the quirks worth remembering, shared with your co-pilot or the owner and synced to every phone.</div></div>' +

      '<div class="card cap"><div class="demo">' +
        '<div class="lab" style="margin:0">Jet A wholesale · Gulf Coast spot</div>' +
        '<div class="row">' + mono('$3.62<span class="tiny muted"> /gal</span>', 'font-size:22px;font-weight:700') + pill('good', '&#9660; 9¢ / 30 d') + '</div>' +
        '<div class="row" style="border-top:1px dashed var(--line2);padding-top:8px"><span class="tiny muted">WTI crude ' + pill('acc', 'live') + '</span>' + mono('$85.90', 'font-weight:700') + '</div>' +
        '<div class="row"><span class="tiny muted">Services · KHPN</span><span>' + pill('good', 'Jet A') + ' ' + pill('warn', 'Landing fee') + '</span></div>' +
      '</div><div class="ct">Market floor and field facts</div><div class="cd">Official Jet A spot and live crude so you know when the whole market moves, plus FAA-file fuel types, repair services and landing-fee flags per airport.</div></div>' +
    '</div></section>' +

    '<section><h2 class="sec">How it works</h2><div class="card"><div class="steps">' +
      '<div class="step"><div class="num">01</div><div class="st">Build the trip</div><div class="sd">Add legs by airport code. Distance, winds-corrected time, burn and cost fill in per leg with the arrival runway graded. One tap opens the route in ForeFlight.</div></div>' +
      '<div class="step"><div class="num">02</div><div class="st">Check the field</div><div class="sd">Live METAR and TAF, crosswind per runway, density altitude, fuel and repair on the FAA file, your crew\'s prices and FBO notes, and alternates within 25, 40 or 60 nm.</div></div>' +
      '<div class="step"><div class="num">03</div><div class="st">Score the fuel stop</div><div class="sd">Pick where you land and where the cheap gas is. The calculator charges the stop against you and hands back a signed dollar figure and a breakeven.</div></div>' +
    '</div></div></section>' +

    '<section id="pricing"><h2 class="sec">Pricing</h2>' +
      '<div class="landing-heading" style="margin-bottom:6px">Less than one ramp fee a month.</div>' +
      '<p class="muted" style="margin:0 2px 14px;font-size:15px">Every account starts with 14 days of Pro, no card. Pro pays for itself the first time it says skip the stop.</p>' +
      '<div class="plans three">' +
        '<div class="card plan"><div class="lab">Free</div><div class="price">$0</div>' +
          '<ul class="plist"><li>Airport lookup and runway verdicts</li><li>Live METAR and TAF, density altitude</li><li>Near Me with filters</li><li>Fuel-stop calculator</li><li>One saved trip</li><li>Your own price log</li></ul>' +
          '<button class="btn" data-auth="register" style="width:100%">Create free account</button></div>' +
        '<div class="card plan pro"><div class="row"><div class="lab">Pro monthly</div>' + pill('acc', '14-day trial') + '</div><div class="price">$' + p.monthly.toFixed(2) + '<span class="per">/mo</span></div>' +
          '<ul class="plist"><li>Everything in Free</li><li>Unlimited trips</li><li>Winds-aloft groundspeeds</li><li>Live crosswind and best runway</li><li>Market reference</li><li>FBO and crew-car intel</li><li>Crew sharing, up to 10 people</li></ul>' +
          '<button class="btn primary" data-auth="register" style="width:100%">Start Pro trial</button></div>' +
        '<div class="card plan"><div class="row"><div class="lab">Pro annual</div>' + pill('good', 'save ' + savePct + '%') + '</div><div class="price">$' + p.annual + '<span class="per">/yr</span></div>' +
          '<ul class="plist"><li>Everything in Pro</li><li>Save $' + annualSave + ' compared with monthly</li><li>One invoice for the owner\'s books</li><li>Cancel any time from your account</li></ul>' +
          '<button class="btn" data-auth="register" style="width:100%">Start free trial</button></div>' +
      '</div>' +
    '</section>' +

    '<section><h2 class="sec">Straight answers</h2>' +
      '<details class="faq" open><summary class="q">Does it replace ForeFlight?</summary><div class="a">No. It is the desk beside it. You still file and fly in ForeFlight; JetDesk is where the cost, runway and FBO homework gets done first, and every trip opens in ForeFlight with one tap.</div></details>' +
      '<details class="faq"><summary class="q">Does it work with no signal?</summary><div class="a">Yes. The airport and runway database, your trips, prices, notes and both calculators live on the phone. Weather, winds and market data rejoin the moment you have coverage.</div></details>' +
      '<details class="faq"><summary class="q">Where do fuel prices come from?</summary><div class="a">From you and your crew, in ten seconds per airport, with AirNav one tap away to check. Prices flag themselves stale after two weeks. The market reference tells you when the whole board is moving.</div></details>' +
      '<details class="faq"><summary class="q">Can I try it without an account?</summary><div class="a">Yes. Explore airport and runway data first. A free account adds saved trips, your price log and a 14-day Pro trial with no credit card.</div></details>' +
    '</section>' +

    '<section style="margin-top:22px"><div class="finalcta">' +
      '<div><div style="font-family:var(--disp);font-weight:800;font-size:clamp(22px,5vw,30px);letter-spacing:-.02em;line-height:1.1">Your next trip is a number, not a guess.</div><div class="muted" style="font-size:14px;margin-top:6px">Free account, 14 days of Pro, nothing to install but a home-screen icon.</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start"><button class="btn primary" data-auth="register" style="min-height:52px;padding:0 22px;font-size:15px">Start planning free</button><span class="micro muted">hello@jetdesk.ai · answered by a human</span></div>' +
    '</div></section>' +

    '<div class="micro muted" style="text-align:center;margin:22px 0 8px">www.jetdesk.ai · ' +
      '<a href="/notes/" style="color:inherit">Field notes</a> · <a href="/terms/" style="color:inherit">Terms</a> · <a href="/privacy/" style="color:inherit">Privacy</a> · Planning aid only, not for navigation.</div>' +
    '</div>';
  $('tab-welcome').innerHTML = h;
  $('browseBtn').addEventListener('click', function () { S.browse = true; save(); showTab('apt'); });
  $('seeSavings').addEventListener('click', function () {
    var el = $('savings');
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
}
function feat(t, d) {
  return '<div class="feat"><div class="ft">' + t + '</div><div class="fd">' + d + '</div></div>';
}

/* ================= AUTH MODAL ================= */
var verifyPromptAt = 0;
function promptVerify(msg) {
  if (!loggedIn() || !AUTH.me.email_ready) return;
  var t = Date.now();
  if (t - verifyPromptAt < 30000) return;
  verifyPromptAt = t;
  showToast(msg || 'Verify your email to sync.');
  if (!$('modalWrap').classList.contains('on')) setTimeout(openVerify, 400);
}
function verifyNoticeHTML() {
  if (!loggedIn() || AUTH.me.user.verified || !AUTH.me.email_ready) return '';
  return '<div class="notice" style="margin-bottom:10px"><b>Verify your email.</b> Until then this phone keeps your work but nothing syncs or shares. ' +
    '<button class="btn small" data-verify="1" style="margin-left:6px">Enter code</button></div>';
}
document.addEventListener('click', function (e) {
  if (e.target.closest('[data-verify]')) openVerify();
});

function openAuth(mode) {
  var reg = mode === 'register';
  openModal(
    '<h2 class="sec" style="margin-top:0">' + (reg ? 'Create your account' : 'Sign in') + '</h2>' +
    (reg ? '<label class="f"><span class="lab">Name</span><input class="t" id="auName" autocomplete="name" placeholder="Dale"></label>' : '') +
    '<label class="f"><span class="lab">Email</span><input class="t" id="auEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" placeholder="you@example.com"></label>' +
    '<label class="f"><span class="lab">Password</span><input class="t" id="auPass" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" placeholder="' + (reg ? 'At least 8 characters' : '') + '"></label>' +
    '<div class="tiny" id="auErr" style="color:var(--bad);min-height:18px"></div>' +
    '<div class="btnrow"><button class="btn primary" id="auGo" style="flex:1">' + (reg ? 'Create account' : 'Sign in') + '</button>' +
    '<button class="btn ghost" id="auCancel">Cancel</button></div>' +
    '<div class="tiny muted" style="margin-top:12px">' +
      (reg ? 'Already have one? <button class="linkbtn" data-swap="login">Sign in</button>' : 'New here? <button class="linkbtn" data-swap="register">Create a free account</button> · <button class="linkbtn" id="auForgot">Forgot password?</button>') +
      (reg ? '<div style="margin-top:6px">By creating an account you agree to the <button class="linkbtn" data-legal="1">terms and privacy policy</button>.</div>' : '') +
    '</div>'
  );
  $('auCancel').addEventListener('click', closeModal);
  if ($('auForgot')) $('auForgot').addEventListener('click', function () { openForgot($('auEmail').value.trim()); });
  $('modalBody').querySelectorAll('[data-swap]').forEach(function (b) {
    b.addEventListener('click', function () { openAuth(b.dataset.swap); });
  });
  var go = function () {
    var email = $('auEmail').value.trim(), pass = $('auPass').value;
    var body = { email: email, password: pass };
    if (reg) body.name = $('auName').value.trim();
    $('auErr').textContent = '';
    $('auGo').disabled = true; $('auGo').textContent = reg ? 'Creating...' : 'Signing in...';
    api('/api/auth/' + (reg ? 'register' : 'login'), { body: body }).then(function (r) {
      if (!r.ok) {
        $('auErr').textContent = r.data.error || (r.status === 0 ? 'No connection. Try again with signal.' : 'Something went wrong.');
        $('auGo').disabled = false; $('auGo').textContent = reg ? 'Create account' : 'Sign in';
        return;
      }
      setTok(r.data.token); AUTH.me = r.data.me; applyProfile();
      S.browse = true; save();
      closeModal();
      showToast(reg ? 'Welcome to ' + BRAND + '. Your Pro trial is running.' : 'Signed in.');
      RP.configured = null;
      pricesFetch(true).then(function () { flushQ(function () { renderAll(); }); renderAll(); });
      showTab('trip');
      if (reg && AUTH.me.email_ready) setTimeout(openVerify, 600);
    });
  };
  $('auGo').addEventListener('click', go);
  $('auPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  setTimeout(function () { var f = $(reg ? 'auName' : 'auEmail'); if (f) f.focus(); }, 80);
}

function finishSignIn(r, msg) {
  setTok(r.data.token); AUTH.me = r.data.me; applyProfile();
  S.browse = true; save();
  closeModal();
  showToast(msg || 'Signed in.');
  RP.configured = null;
  pricesFetch(true).then(function () { flushQ(function () { renderAll(); }); renderAll(); });
  showTab('trip');
}
function openForgot(prefill) {
  openModal(
    '<h2 class="sec" style="margin-top:0">Reset your password</h2>' +
    '<div class="tiny muted" style="margin-bottom:10px">Enter your account email. We will send a 6-digit code.</div>' +
    '<label class="f"><span class="lab">Email</span><input class="t" id="fgEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" value="' + esc(prefill || '') + '"></label>' +
    '<div id="fgStep2" style="display:none">' +
      '<label class="f"><span class="lab">Code from the email</span><input class="t mono" id="fgCode" inputmode="numeric" maxlength="6" placeholder="123456" style="letter-spacing:.2em"></label>' +
      '<label class="f"><span class="lab">New password</span><input class="t" id="fgPass" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>' +
    '</div>' +
    '<div class="tiny" id="fgErr" style="color:var(--bad);min-height:18px"></div>' +
    '<div class="btnrow"><button class="btn primary" id="fgGo" style="flex:1">Send code</button><button class="btn ghost" id="fgCancel">Cancel</button></div>' +
    '<div class="tiny muted" style="margin-top:12px"><button class="linkbtn" id="fgBack">Back to sign in</button></div>'
  );
  var step = 1;
  $('fgCancel').addEventListener('click', closeModal);
  $('fgBack').addEventListener('click', function () { openAuth('login'); });
  var go = function () {
    var email = $('fgEmail').value.trim();
    $('fgErr').textContent = '';
    if (step === 1) {
      $('fgGo').disabled = true; $('fgGo').textContent = 'Sending...';
      api('/api/auth/forgot', { body: { email: email } }).then(function (r) {
        $('fgGo').disabled = false;
        if (!r.ok) { $('fgErr').textContent = r.data.error || 'Could not send the code.'; $('fgGo').textContent = 'Send code'; return; }
        step = 2; $('fgStep2').style.display = ''; $('fgGo').textContent = 'Set new password';
        $('fgEmail').readOnly = true;
        showToast('If that email has an account, a code is on its way.');
        setTimeout(function () { $('fgCode').focus(); }, 60);
      });
    } else {
      $('fgGo').disabled = true; $('fgGo').textContent = 'Saving...';
      api('/api/auth/reset', { body: { email: email, code: $('fgCode').value, password: $('fgPass').value } }).then(function (r) {
        if (!r.ok) { $('fgErr').textContent = r.data.error || 'Could not reset.'; $('fgGo').disabled = false; $('fgGo').textContent = 'Set new password'; return; }
        finishSignIn(r, 'Password updated. You are signed in.');
      });
    }
  };
  $('fgGo').addEventListener('click', go);
  $('modalBody').querySelectorAll('input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
  setTimeout(function () { $(prefill ? 'fgGo' : 'fgEmail').focus(); }, 80);
}

function openVerify() {
  openModal(
    '<h2 class="sec" style="margin-top:0">Verify your email</h2>' +
    '<div class="tiny muted" style="margin-bottom:10px">We sent a 6-digit code to ' + esc(AUTH.me.user.email) + '.</div>' +
    '<input class="t mono" id="vfCode" inputmode="numeric" maxlength="6" placeholder="123456" style="font-size:24px;letter-spacing:.2em;text-align:center">' +
    '<div class="tiny" id="vfErr" style="color:var(--bad);min-height:18px"></div>' +
    '<div class="btnrow"><button class="btn primary" id="vfGo" style="flex:1">Verify</button><button class="btn ghost" id="vfLater">Later</button></div>' +
    '<div class="tiny muted" style="margin-top:10px">No code? <button class="linkbtn" id="vfResend">Send again</button></div>'
  );
  $('vfLater').addEventListener('click', closeModal);
  $('vfGo').addEventListener('click', function () {
    api('/api/auth/verify', { body: { code: $('vfCode').value } }).then(function (r) {
      if (!r.ok) { $('vfErr').textContent = r.data.error || 'Could not verify.'; return; }
      AUTH.me = r.data.me; closeModal(); showToast('Email verified.'); renderAccount();
    });
  });
  $('vfResend').addEventListener('click', function () {
    api('/api/auth/verify', { body: { resend: true } }).then(function (r) { showToast(r.ok ? 'New code sent.' : (r.data.error || 'Could not send.')); });
  });
}

function openLegal() {
  openModal(
    '<h2 class="sec" style="margin-top:0">Terms and privacy</h2>' +
    '<div class="tiny" style="line-height:1.55">' +
    '<p><b>Planning aid only.</b> ' + BRAND + ' aggregates public aviation data and your own notes to help you plan. It is not a source of official weather briefings, NOTAMs, performance data or navigation. You remain pilot in command and responsible for verifying everything with official sources before flight.</p>' +
    '<p><b>Your account.</b> You need a valid email and a password of at least 8 characters. You are responsible for activity under your account. Crew members you invite can see and edit the shared operation data.</p>' +
    '<p><b>Subscriptions.</b> Pro is billed monthly or annually through Stripe and renews automatically until cancelled from the billing portal. Cancelling stops future charges; access continues to the end of the paid period. Trials convert to Free unless you subscribe.</p>' +
    '<p><b>Privacy.</b> We store your email, name, aircraft details, trips, prices and notes to run the service, and payment status from Stripe (never card numbers). Location is used on your device only and is never uploaded. We do not sell personal data. You can delete your account and its data at any time from the Account tab.</p>' +
    '<p><b>Data sources.</b> Airport and runway data from the FAA and OurAirports; weather from the FAA Aviation Weather Center; market data from the U.S. EIA and OilPriceAPI. Accuracy is not guaranteed.</p>' +
    '<p style="margin-top:10px"><b>The full documents.</b> <a href="/terms/">Terms of Service</a> · <a href="/privacy/">Privacy Policy</a></p>' +
    '</div>' +
    '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="lgClose" style="flex:1">Close</button></div>'
  );
  $('lgClose').addEventListener('click', closeModal);
}
document.addEventListener('click', function (e) {
  var l = e.target.closest('[data-legal]');
  if (l) openLegal();
});

/* ================= ACCOUNT TAB ================= */
function fmtDate(ms) {
  if (!ms) return '';
  var d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function renderAccount() {
  var v = $('tab-account');
  if (!loggedIn()) {
    v.innerHTML = '<h2 class="sec">Account</h2>' + lockedHTML('Sign in to sync trips, prices and notes across devices and share them with your crew.') +
      '<div class="micro muted" style="margin:10px 2px"><button class="linkbtn" data-legal="1">Terms and privacy</button></div>';
    return;
  }
  var me = AUTH.me, u = me.user, op = me.op || { members: [], all: [] };
  var p = me.prices || { monthly: 9.99, annual: 79 };
  var savePct = Math.round((1 - p.annual / (p.monthly * 12)) * 100);

  var planLine, planPill;
  if (u.plan === 'comp') { planLine = 'Complimentary Pro. Enjoy.'; planPill = '<span class="pill good">Pro</span>'; }
  else if (u.plan === 'pro') { planLine = 'Pro, ' + (u.sub_interval === 'year' ? 'annual' : 'monthly') + ', renews ' + fmtDate(u.plan_until ? u.plan_until - 3 * 86400000 : null) + '.'; planPill = '<span class="pill good">Pro</span>'; }
  else if (me.trial_days_left > 0) { planLine = 'Pro trial, ' + me.trial_days_left + ' day' + (me.trial_days_left === 1 ? '' : 's') + ' left. Everything unlocked.'; planPill = '<span class="pill acc">Trial</span>'; }
  else { planLine = 'Free plan. One trip, no winds, no market data, no crew sharing.'; planPill = '<span class="pill dim">Free</span>'; }

  var h = '<h2 class="sec">Profile</h2><div class="card">' +
    '<div class="spread" style="margin-bottom:8px"><div><div style="font-family:var(--disp);font-weight:600;font-size:18px">' + esc(u.name || 'Pilot') + '</div>' +
    '<div class="tiny muted">' + esc(u.email) + '</div></div>' +
    (u.verified ? '<span class="pill good">Verified</span>' : (me.email_ready ? '<button class="btn small" id="acVerify">Verify email</button>' : '')) + '</div>' +
    '<div class="grid2">' +
      '<label class="f"><span class="lab">Name</span><input class="t" id="acName" value="' + esc(u.name || '') + '"></label>' +
      '<label class="f"><span class="lab">Tail number</span><input class="t mono" id="acTail" autocapitalize="characters" value="' + esc(u.tail || S.settings.tail || '') + '"></label>' +
    '</div>' +
    '<div class="grid2">' +
      '<label class="f"><span class="lab">Home base</span><input class="t mono" id="acHome" autocapitalize="characters" value="' + esc(u.home_base || S.settings.homeBase || '') + '"></label>' +
      '<label class="f"><span class="lab">Operation name</span><input class="t" id="acOp" value="' + esc(op.name || '') + '"' + (op.is_owner ? '' : ' disabled') + '></label>' +
    '</div>' +
    '<div class="btnrow"><button class="btn" id="acSave">Save profile</button><button class="btn ghost" id="acPerf">Airplane numbers</button></div>' +
  '</div>';

  h += '<h2 class="sec">Plan</h2><div class="card" id="planCard">' +
    '<div class="spread"><div style="font-size:14px">' + planLine + '</div>' + planPill + '</div>';
  if (u.plan !== 'pro' && u.plan !== 'comp') {
    h += '<hr class="dash"><div class="plans compact">' +
      '<button class="btn primary" id="goMonthly">Pro monthly<br><span class="mono" style="font-size:16px">$' + p.monthly.toFixed(2) + '/mo</span></button>' +
      '<button class="btn primary" id="goAnnual">Pro annual<br><span class="mono" style="font-size:16px">$' + p.annual + '/yr</span> <span class="pill good" style="margin-left:4px">save ' + savePct + '%</span></button>' +
    '</div>' +
    (me.billing_ready ? '<div class="micro muted" style="margin-top:8px">Secure checkout by Stripe. Cancel any time.</div>'
      : '<div class="micro muted" style="margin-top:8px">Payments open soon. Your trial keeps running until they do.</div>');
  }
  if (u.has_billing) h += '<div class="btnrow" style="margin-top:10px"><button class="btn small" id="goPortal">Manage billing</button></div>';
  h += '</div>';

  h += '<h2 class="sec">Crew' + (me.pro ? '' : ' <span class="pill acc">Pro</span>') + '</h2><div class="card">' +
    '<div class="tiny muted" style="margin-bottom:8px">Everyone on the operation sees the same prices, FBOs, trips and notes.</div>';
  if (op.all && op.all.length > 1) {
    h += '<div class="btnrow" style="margin-bottom:10px">' + op.all.map(function (o) {
      return '<button class="btn small' + (o.id === op.id ? ' primary' : '') + '" data-opsw="' + esc(o.id) + '">' + esc(o.name) + '</button>';
    }).join('') + '</div>';
  }
  h += (op.members || []).map(function (m) {
    return '<div class="fuelrow"><span class="fbo" style="flex:1">' + esc(m.email) + (m.role === 'owner' ? ' <span class="pill dim">owner</span>' : (m.role === 'viewer' ? ' <span class="pill acc">view only</span>' : '')) + '</span>' +
      (op.is_owner && m.role !== 'owner' ? '<button class="iconbtn" data-rm="' + esc(m.email) + '" aria-label="Remove" style="width:30px;height:30px">&#10005;</button>' : '') + '</div>';
  }).join('');
  if (op.is_owner) {
    h += me.pro
      ? '<hr class="dash"><div class="grid3" style="grid-template-columns:1fr auto auto"><input class="t" id="invEmail" type="email" inputmode="email" autocapitalize="none" placeholder="copilot@example.com">' +
        '<select class="t" id="invRole"><option value="member">Crew (edits)</option><option value="viewer">Owner (view only)</option></select><button class="btn" id="invGo">Invite</button></div>' +
        '<div class="micro muted" style="margin-top:6px">Crew can add prices, FBOs and trips. Owner view sees everything and edits nothing. They sign up with that email and the shared operation appears in their app.</div>'
      : '<hr class="dash">' + upsellHTML('Invite your co-pilot or the owner to share prices, FBOs and trips.');
  }
  h += '</div>';

  h += '<h2 class="sec">Security</h2><div class="card">' +
    '<div class="tiny muted" style="margin-bottom:6px">Change password</div>' +
    '<div class="grid2"><input class="t" id="pwCur" type="password" autocomplete="current-password" placeholder="Current password"><input class="t" id="pwNew" type="password" autocomplete="new-password" placeholder="New password (8+)"></div>' +
    '<div class="btnrow" style="margin-top:6px"><button class="btn small" id="pwGo">Update password</button></div>' +
    '<hr class="dash"><div class="tiny muted" style="margin-bottom:6px">Change email</div>' +
    '<div class="grid2"><input class="t" id="emNew" type="email" inputmode="email" autocapitalize="none" placeholder="New email"><input class="t" id="emPass" type="password" autocomplete="current-password" placeholder="Password"></div>' +
    '<div class="grid3" id="emStep2" style="grid-template-columns:1fr auto;margin-top:6px;display:none"><input class="t mono" id="emCode" inputmode="numeric" maxlength="6" placeholder="Code from the new address"><button class="btn small" id="emConfirm">Confirm</button></div>' +
    '<div class="btnrow" style="margin-top:6px"><button class="btn small" id="emGo">Send code</button></div>' +
    '<hr class="dash"><div class="spread"><div class="tiny muted">Signed-in devices</div><button class="btn small ghost" id="sesOut">Sign out other devices</button></div>' +
    '<div id="sesList" class="tiny" style="margin-top:6px">Loading...</div>' +
  '</div>';

  if (u.is_admin) {
    h += '<h2 class="sec">Admin</h2><div class="card">' +
      '<div class="tiny muted" style="margin-bottom:8px">Grant complimentary Pro to an account by email.</div>' +
      '<div class="grid3" style="grid-template-columns:1fr auto"><input class="t" id="adEmail" type="email" placeholder="pilot@example.com"><button class="btn" id="adComp">Comp Pro</button></div>' +
      '<div class="btnrow" style="margin-top:8px"><button class="btn small ghost" id="adStats">Metrics</button><button class="btn small ghost" id="adList">List accounts</button><button class="btn small ghost" id="adMail">Send me a test email</button></div><div id="adOut" class="tiny" style="margin-top:8px"></div></div>';
  }

  h += '<h2 class="sec">Account</h2><div class="card">' +
    '<div class="btnrow"><button class="btn" id="acOut">Sign out</button><button class="btn ghost" data-legal="1">Terms and privacy</button>' +
    '<button class="btn small danger" id="acDel">Delete account</button></div>' +
    '<div class="micro muted" style="margin-top:8px">Deleting removes your account, operations you own, and their data. Cancel any subscription first.</div></div>';
  v.innerHTML = h;

  var on = function (id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); };
  on('acVerify', openVerify);
  on('acPerf', openSheet);
  on('pwGo', function () {
    var cur = $('pwCur').value, nw = $('pwNew').value;
    if (nw.length < 8) { showToast('New password needs at least 8 characters.'); return; }
    api('/api/auth/password', { body: { current: cur, password: nw } }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not change password.'); return; }
      $('pwCur').value = ''; $('pwNew').value = ''; showToast('Password updated. Other devices were signed out.'); loadSessions();
    });
  });
  on('emGo', function () {
    api('/api/auth/email', { body: { email: $('emNew').value.trim(), password: $('emPass').value } }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not start the change.'); return; }
      $('emStep2').style.display = ''; showToast('Code sent to ' + r.data.pending + '.'); $('emCode').focus();
    });
  });
  on('emConfirm', function () {
    api('/api/auth/email', { body: { code: $('emCode').value } }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not confirm.'); return; }
      AUTH.me = r.data.me; showToast('Email updated.'); renderAccount();
    });
  });
  on('sesOut', function () {
    api('/api/auth/sessions', { body: { revoke: 'others' } }).then(function (r) {
      showToast(r.ok ? 'Signed out ' + r.data.revoked + ' other device' + (r.data.revoked === 1 ? '' : 's') + '.' : (r.data.error || 'Failed.'));
      loadSessions();
    });
  });
  function loadSessions() {
    api('/api/auth/sessions').then(function (r) {
      var el = $('sesList'); if (!el) return;
      if (!r.ok) { el.textContent = 'Could not load devices.'; return; }
      el.innerHTML = (r.data.sessions || []).map(function (x) {
        return '<div class="fuelrow"><span class="fbo" style="flex:1">' + esc(x.device) + (x.current ? ' <span class="pill acc">this device</span>' : '') + '</span><span class="d">since ' + fmtDate(x.created) + '</span></div>';
      }).join('') || 'No devices.';
    });
  }
  loadSessions();
  on('acSave', function () {
    var body = { name: $('acName').value, tail: $('acTail').value, home_base: $('acHome').value };
    if (op.is_owner) body.op_name = $('acOp').value;
    api('/api/me', { body: body }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not save.'); return; }
      AUTH.me = r.data; S.settings.tail = body.tail.toUpperCase(); S.settings.homeBase = body.home_base.toUpperCase(); save();
      renderSub(); showToast('Profile saved.'); renderAccount();
    });
  });
  var checkout = function (plan) {
    api('/api/billing/checkout', { body: { plan: plan } }).then(function (r) {
      if (r.ok && r.data.url) { location.href = r.data.url; return; }
      showToast(r.data.error || 'Checkout unavailable right now.');
    });
  };
  on('goMonthly', function () { checkout('monthly'); });
  on('goAnnual', function () { checkout('annual'); });
  on('goPortal', function () {
    api('/api/billing/portal', { body: {} }).then(function (r) {
      if (r.ok && r.data.url) location.href = r.data.url; else showToast(r.data.error || 'Portal unavailable.');
    });
  });
  on('invGo', function () {
    api('/api/ops/invite', { body: { email: $('invEmail').value, role: $('invRole') ? $('invRole').value : 'member' } }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not invite.'); return; }
      AUTH.me = r.data; showToast('Invited.'); renderAccount();
    });
  });
  v.querySelectorAll('[data-rm]').forEach(function (b) {
    b.addEventListener('click', function () {
      api('/api/ops/invite', { body: { email: b.dataset.rm, remove: true } }).then(function (r) {
        if (r.ok) { AUTH.me = r.data; renderAccount(); } else showToast(r.data.error || 'Could not remove.');
      });
    });
  });
  v.querySelectorAll('[data-opsw]').forEach(function (b) {
    b.addEventListener('click', function () {
      api('/api/ops/switch', { body: { op_id: b.dataset.opsw } }).then(function (r) {
        if (r.ok) { AUTH.me = r.data; RP.configured = null; pricesFetch(true).then(function () { renderAll(); renderAccount(); }); }
      });
    });
  });
  on('adComp', function () {
    api('/api/admin/comp', { body: { email: $('adEmail').value, plan: 'comp' } }).then(function (r) {
      showToast(r.ok ? 'Comped ' + r.data.email : (r.data.error || 'Failed.'));
    });
  });
  on('adMail', function () {
    api('/api/admin/testmail', { body: {} }).then(function (r) {
      showToast(r.ok && r.data.sent ? 'Test email sent to ' + r.data.to + ' via ' + r.data.via : (r.data.error || 'Send failed.'));
    });
  });
  on('adStats', function () {
    api('/api/admin/stats').then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Failed.'); return; }
      var a = r.data.accounts || {}, t = r.data.totals || {};
      var cell = function (n, l) { return '<div class="card stat2" style="padding:10px;margin:0"><div class="n" style="font-size:22px">' + fmtNum(n || 0) + '</div><div class="t" style="font-size:12px">' + l + '</div></div>'; };
      $('adOut').innerHTML =
        '<div class="stats" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:8px">' +
          cell(a.users, 'accounts') + cell(a.pro, 'paying Pro') + cell(a.comp, 'comped') +
          cell(a.trialing, 'on trial') + cell(a.free, 'free') + cell(a.verified, 'verified') +
          cell(a.active7, 'active 7 days') + cell(a.active30, 'active 30 days') + cell(t.signup, 'signups 30 days') +
          cell(t.login, 'sign-ins 30 days') + cell(t.checkout, 'checkouts started') + cell(t.subscribed, 'subscriptions') +
        '</div><div class="micro muted">Counted on our own servers, no trackers. Active means opened the app while signed in.</div>';
    });
  });
  on('adList', function () {
    api('/api/admin/comp').then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Failed.'); return; }
      $('adOut').innerHTML = (r.data.users || []).map(function (x) {
        return '<div class="fuelrow"><span class="fbo" style="flex:1">' + esc(x.email) + '</span><span class="pill dim">' + esc(x.plan) + '</span><span class="d">' + fmtDate(x.created) + '</span></div>';
      }).join('') || 'No accounts yet.';
    });
  });
  on('acOut', function () {
    api('/api/auth/logout', { body: {} }).then(function () {
      setTok(null); AUTH.me = null; RP.configured = false;
      S.trips = []; S.activeTrip = null; S.fuelLog = {}; S.fbos = {}; S.notes = {}; S.q = []; S.browse = false; save();
      showToast('Signed out.'); renderGate();
    });
  });
  on('acDel', function () {
    var b = $('acDel');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Really delete everything?'; setTimeout(function () { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete account'; } }, 4000); return; }
    api('/api/me', { method: 'DELETE' }).then(function (r) {
      if (!r.ok) { showToast(r.data.error || 'Could not delete.'); return; }
      setTok(null); AUTH.me = null; S = JSON.parse(JSON.stringify(DEF)); save(); showToast('Account deleted.'); renderGate();
    });
  });
}

/* ---------- boot ---------- */
applyTheme();
renderSub();
var bq = new URLSearchParams(location.search);
if (AUTH.tok) {
  loadMe().then(function (me) {
    if (!me) { if (!AUTH.tok) { renderGate(); return; } }
    renderGate();
    pricesFetch(true).then(function () { flushQ(function () { renderAll(); }); renderAll(); });
    if (bq.get('billing') === 'success') {
      showToast('Payment received. Activating Pro...');
      var tries = 0;
      var poll = function () { loadMe().then(function (m) { if (m && m.user.plan === 'pro') { showToast('Welcome to ' + BRAND + ' Pro.'); renderAll(); } else if (++tries < 6) setTimeout(poll, 2500); }); };
      setTimeout(poll, 2000);
      history.replaceState(null, '', '/');
    } else if (bq.get('billing')) {
      history.replaceState(null, '', '/');
    }
  });
} else {
  renderGate();
}
})();
