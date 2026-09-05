/* PWA layer: service worker, install prompt, offline badge */
(function () {
'use strict';
var APP_V = '__APP_V__';

/* ---- service worker: install quietly, then hand over on our terms ----
   A new worker precaches and WAITS. If nothing on this page can be lost (no queued sync, no open editor,
   no modal), the page tells it to take over and reloads once. Otherwise a small "Update available" bar
   offers the reload. A per-version marker in sessionStorage guarantees at most one automatic reload,
   so two tabs racing an update can never loop. */
var SW = { reg: null, reloading: false };
function swSafeToReload() {
  try {
    var S = JSON.parse(localStorage.getItem('mfd1') || '{}');
    if (S.q && S.q.length) return false;
  } catch (e) {}
  if (document.querySelector('#modalWrap.on, #sheetWrap.on, #legEd, #addLegCard')) return false;
  var ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.value) return false;
  return true;
}
function swVersionOf(worker, cb) {
  /* the worker answers on the transferred port; a window-level VERSION message is accepted too, for a worker
     that answers through e.source instead */
  var done = false, ch = new MessageChannel();
  var finish = function (v) {
    if (done) return;
    done = true;
    navigator.serviceWorker.removeEventListener('message', onMsg);
    cb(v || null);
  };
  var onMsg = function (e) { if (e.data && e.data.type === 'VERSION') finish(e.data.v); };
  ch.port1.onmessage = function (e) { finish(e.data && e.data.v); };
  navigator.serviceWorker.addEventListener('message', onMsg);
  try { worker.postMessage({ type: 'GET_VERSION' }, [ch.port2]); } catch (e) { finish(null); }
  setTimeout(function () { finish(null); }, 800);
}
function swActivate(worker) {
  if (SW.reloading) return;
  SW.reloading = true;
  worker.postMessage({ type: 'SKIP_WAITING' });
}
function swOffer(worker) {
  swVersionOf(worker, function (v) {
    var key = 'jd_sw_auto_' + (v || 'x');
    var autoDone = false;
    try { autoDone = sessionStorage.getItem(key) === '1'; } catch (e) {}
    if (!autoDone && swSafeToReload()) {
      try { sessionStorage.setItem(key, '1'); } catch (e) {}
      swActivate(worker);
      return;
    }
    showUpdateBar(worker, v);
  });
}
function showUpdateBar(worker, v) {
  if (document.getElementById('swBar')) return;
  var bar = document.createElement('div');
  bar.id = 'swBar'; bar.className = 'swbar'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span>Update available' + (v ? ' <span class="mono">' + v.replace('jetdesk-', '') + '</span>' : '') + '</span>' +
    '<button class="btn primary small" id="swGo">Reload</button><button class="btn ghost small" id="swLater" aria-label="Not now">Later</button>';
  document.body.appendChild(bar);
  document.getElementById('swGo').addEventListener('click', function () { if (worker && worker.state !== 'activated') swActivate(worker); else location.reload(); });
  document.getElementById('swLater').addEventListener('click', function () { bar.remove(); });
}
if ('serviceWorker' in navigator) {
  var hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      SW.reg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) swOffer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) swOffer(nw);
        });
      });
      /* look for a newer build when the app comes back to the foreground */
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
    }).catch(function () {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    /* the new worker now controls this page (this tab or a sibling asked for it): reload once if nothing
       can be lost, otherwise leave the page alone and offer the reload */
    if (!hadController || window.__mfdReloaded) return;
    window.__mfdReloaded = true;
    if (swSafeToReload()) location.reload(); else showUpdateBar(null, null);
  });
}

/* ---- install banner ---- */
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var force = /forceinstall=1/.test(location.search);
var deferredPrompt = null;
var bannerEl = null;

function removeBanner() { if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl); bannerEl = null; }

function showBanner(mode) { // 'prompt' | 'ios'
  if (standalone || bannerEl) return;
  if (lsGet('mfd_pwa_hide') === APP_V) return;
  var host = document.getElementById('tab-trip');
  if (!host) return;
  bannerEl = document.createElement('div');
  bannerEl.className = 'card pwabanner';
  bannerEl.innerHTML =
    '<div class="rowline" style="gap:12px">' +
      '<img src="__ICON_192__" alt="" width="44" height="44" style="border-radius:10px;flex:none">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-family:var(--disp);font-weight:600;font-size:15px;letter-spacing:.04em">PUT IT ON YOUR PHONE</div>' +
        '<div class="tiny muted">Installs like an app and works offline in the plane.</div>' +
      '</div>' +
    '</div>' +
    '<div class="btnrow" style="margin-top:10px">' +
      (mode === 'prompt'
        ? '<button class="btn primary small" id="pwaGo">Install</button>'
        : '<button class="btn primary small" id="pwaHow">Show me how</button>') +
      '<button class="btn ghost small" id="pwaLater">Later</button>' +
    '</div>' +
    '<div id="pwaSteps" style="display:none;margin-top:10px" class="tiny">' +
      'In <b>Safari</b>: tap the <b>Share</b> button (square with the arrow), scroll down, ' +
      'tap <b>Add to Home Screen</b>, then <b>Add</b>. The app icon lands on your home screen.' +
    '</div>';
  host.insertBefore(bannerEl, host.firstChild);
  var later = document.getElementById('pwaLater');
  later.addEventListener('click', function () { lsSet('mfd_pwa_hide', APP_V); removeBanner(); });
  var go = document.getElementById('pwaGo');
  if (go) go.addEventListener('click', function () {
    if (!deferredPrompt) { removeBanner(); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () { deferredPrompt = null; removeBanner(); });
  });
  var how = document.getElementById('pwaHow');
  if (how) how.addEventListener('click', function () {
    var s = document.getElementById('pwaSteps');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
  });
}

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
  showBanner('prompt');
});
window.addEventListener('appinstalled', function () { lsSet('mfd_pwa_hide', APP_V); removeBanner(); });

if (isIOS && !standalone) { showBanner('ios'); }
if (force) { showBanner(deferredPrompt ? 'prompt' : (isIOS ? 'ios' : 'prompt')); }

/* ---- tiny version note in footer ---- */
var disc = document.querySelector('footer.disc');
if (disc) {
  var v = document.createElement('div');
  v.style.marginTop = '4px';
  v.textContent = 'JetDesk ' + APP_V + ' · installs as an app · works offline';
  disc.appendChild(v);
}
})();
