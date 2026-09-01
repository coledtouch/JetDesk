/* PWA layer: service worker, install prompt, offline badge */
(function () {
'use strict';
var APP_V = '__APP_V__';

/* ---- service worker ---- */
if ('serviceWorker' in navigator) {
  var hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (hadController && !window.__mfdReloaded) { window.__mfdReloaded = true; location.reload(); }
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
