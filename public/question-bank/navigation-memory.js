(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  if (window.parent === window || params.get('embedded') !== '1' ||
      ['ids', 'assignmentWork', 'assignment', 'test', 'practice'].some(function (key) { return params.has(key); })) return;
  var host = window.parent;
  var frame;
  var key;
  try {
    if (host.location.origin !== window.location.origin ||
        !/^\/(question-bank\/(aa-hl|aa-sl|ai-hl|ai-sl)|igcse\/question-bank)\/?$/.test(host.location.pathname)) return;
    frame = window.frameElement;
    key = 'mrflynnib-bank-position:v1:' + host.location.pathname + host.location.search + ':' + window.location.search;
  } catch { return; }
  var api = window.mrflynnibBankNavigation;
  var list = document.getElementById('qb-list');
  if (!frame || !api || !list) return;
  var saved = null;
  try {
    saved = JSON.parse(host.sessionStorage.getItem(key));
    if (!saved || typeof saved.id !== 'string' || !Number.isFinite(saved.offset) ||
        !saved.filters || typeof saved.filters !== 'object') saved = null;
  } catch { /* Storage is optional, including in private browsing. */ }
  var restoring = !!saved;
  var disposed = false;
  var started = false;
  var applying = false;
  var restoredFilters = null;
  var timer = 0;
  var saveTimer = 0;
  var deadline = Date.now() + 15000;
  var settledAt = 0;
  var lastTop = null;
  var lastHeight = null;

  function remember() {
    if (restoring || disposed || !api.ready() || !frame.isConnected || frame.style.position === 'fixed') return;
    var frameTop = frame.getBoundingClientRect().top;
    var cards = Array.prototype.slice.call(list.querySelectorAll('.qb-card[data-id]'));
    // Keep the question crossing the top of the reading area, not an index
    // which can change when filters or the question catalogue change.
    var card = cards.find(function (item) { return frameTop + item.getBoundingClientRect().bottom > 120; });
    if (!card) card = cards[cards.length - 1];
    if (!card) return;
    try {
      host.sessionStorage.setItem(key, JSON.stringify({
        id: card.getAttribute('data-id'),
        offset: frameTop + card.getBoundingClientRect().top,
        filters: api.filters(),
        starred: window.__mrflynnibStarredOnly === true
      }));
    } catch { /* A blocked/full store must never break the bank. */ }
  }
  function scheduleSave() {
    host.clearTimeout(saveTimer);
    saveTimer = host.setTimeout(remember, 120);
  }
  function finish() {
    restoring = false;
    window.clearTimeout(timer);
  }
  function restore() {
    if (!restoring || disposed) return;
    if (Date.now() > deadline) { finish(); return; }
    if (!api.ready()) { timer = window.setTimeout(restore, 80); return; }
    if (!started) {
      started = true;
      applying = true;
      api.restoreFilters(saved.filters);
      restoredFilters = api.filters();
      applying = false;
    }
    // Browser history can restore form defaults after our first render.
    // Reconcile once more while settling, unless the reader has taken control.
    if (JSON.stringify(api.filters()) !== JSON.stringify(restoredFilters)) {
      applying = true;
      api.restoreFilters(restoredFilters);
      applying = false;
      settledAt = Date.now();
    }
    // Starred questions arrive with account state, independently of the bank.
    if (saved.starred && window.mrflynnibRestoreStarredFilter &&
        !window.mrflynnibRestoreStarredFilter()) {
      timer = window.setTimeout(restore, 80); return;
    }
    var result = api.reveal(saved.id);
    if (result === 'loading') { timer = window.setTimeout(restore, 0); return; }
    if (result === 'missing') { finish(); return; }
    var card = Array.prototype.find.call(list.querySelectorAll('.qb-card[data-id]'), function (item) {
      return item.getAttribute('data-id') === saved.id;
    });
    if (!card) { timer = window.setTimeout(restore, 80); return; }
    var top = host.scrollY + frame.getBoundingClientRect().top + card.getBoundingClientRect().top;
    var target = Math.max(0, top - saved.offset);
    // Parent iframe sizing and fonts can settle after the cards themselves.
    // Retry until both the anchor and its containing frame have settled.
    if (Math.abs(host.scrollY - target) > 2) host.scrollTo({ top: target, behavior: 'instant' });
    var height = frame.getBoundingClientRect().height;
    if (lastTop !== top || lastHeight !== height || Math.abs(host.scrollY - target) > 2) settledAt = Date.now();
    lastTop = top;
    lastHeight = height;
    if (!settledAt) settledAt = Date.now();
    if (Date.now() - settledAt >= 800) { finish(); return; }
    timer = window.setTimeout(restore, 80);
  }
  function userIntent(event) {
    if (!event.isTrusted || applying) return;
    if (event.type === 'keydown' && !/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(event.key)) return;
    finish(); // Never pull the reader back after they deliberately move.
    scheduleSave();
  }
  function filterChanged() {
    if (applying) return;
    finish();
    scheduleSave();
  }
  function beforeNavigate() { remember(); }
  function cleanup() {
    remember();
    disposed = true;
    window.clearTimeout(timer);
    host.clearTimeout(saveTimer);
    connectionObserver.disconnect();
    host.removeEventListener('scroll', scheduleSave);
    host.removeEventListener('pagehide', beforeNavigate);
    host.document.removeEventListener('click', beforeNavigate, true);
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (name) {
      host.removeEventListener(name, userIntent, true);
    });
  }
  var connectionObserver = new host.MutationObserver(function () {
    if (!frame.isConnected) cleanup();
  });
  connectionObserver.observe(host.document.body, { childList: true, subtree: true });
  host.addEventListener('scroll', scheduleSave, { passive: true });
  host.addEventListener('pagehide', beforeNavigate);
  host.document.addEventListener('click', beforeNavigate, true);
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (name) {
    host.addEventListener(name, userIntent, { capture: true, passive: true });
    window.addEventListener(name, userIntent, { capture: true, passive: true });
  });
  var controls = document.getElementById('qb-controls');
  if (controls) {
    controls.addEventListener('input', filterChanged);
    controls.addEventListener('change', filterChanged);
  }
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) remember();
    else cleanup();
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      try { saved = JSON.parse(host.sessionStorage.getItem(key)); } catch { return; }
      if (!saved || typeof saved.id !== 'string' || !Number.isFinite(saved.offset) || !saved.filters) return;
      restoring = true;
      started = false;
      settledAt = 0;
      deadline = Date.now() + 15000;
      restore();
    }
  });
  restore();
}());
