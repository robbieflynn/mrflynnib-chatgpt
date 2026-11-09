(function () {
  'use strict';

  var courses = { 'AA HL': 'aa-hl', 'AA SL': 'aa-sl', 'AI HL': 'ai-hl', 'AI SL': 'ai-sl' };
  var positions = {};
  var active = null;
  var origin = window.location.origin;

  // The bank can sit inside a very tall iframe (and course practice can be
  // nested twice). Put the dialog in the same-origin outer document so it is
  // anchored to the student's viewport, never to the full question-list height.
  function hostWindow() {
    var host = window;
    try {
      while (host.parent !== host && host.parent.location.origin === origin) host = host.parent;
    } catch { /* A cross-origin embed stays inside its own document. */ }
    return host;
  }

  function close() {
    if (!active) return;
    // Read before close() hides the iframe: hidden frames can report scrollY=0.
    try { if (!active.frame.hidden) positions[active.course] = active.frame.contentWindow.scrollY; } catch { /* Keep the previous position after a failed load. */ }
    active.dialog.close();
  }

  function open(button) {
    var course = button.getAttribute('data-formula-course');
    if (!Object.prototype.hasOwnProperty.call(courses, course)) return;
    if (active) { active.dialog.querySelector('button').focus(); return; }
    var host = hostWindow();
    var doc = host.document;
    if (doc.querySelector('.qb-formula-dialog[open]')) return;
    if (!doc.querySelector('link[data-formula-styles]')) {
      var style = doc.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/question-bank/formula-booklet.css?v=1';
      style.setAttribute('data-formula-styles', '');
      doc.head.appendChild(style);
    }
    var dialog = doc.createElement('dialog');
    dialog.className = 'qb-formula-dialog';
    dialog.setAttribute('aria-label', course + ' Formula booklet');
    dialog.innerHTML = '<div class="qb-formula-shell"><header class="qb-formula-header"><div><h2>Formula booklet</h2><div class="qb-formula-course"></div></div><button type="button" class="qb-formula-close" aria-label="Close formula booklet" autofocus>×</button></header><div class="qb-formula-status" role="status">Loading formula booklet…</div><iframe class="qb-formula-frame" hidden></iframe></div>';
    dialog.querySelector('.qb-formula-course').textContent = course;
    var frame = dialog.querySelector('iframe');
    frame.title = course + ' formula booklet';
    var status = dialog.querySelector('.qb-formula-status');
    var url = '/question-bank/formula-booklets/' + courses[course] + '.html?v=1';
    var timer;
    var root = doc.documentElement;
    var previousOverflow = root.style.overflow;
    var owner = { dialog: dialog, frame: frame, course: course };
    active = owner;

    function failed() {
      if (active !== owner) return;
      host.clearTimeout(timer);
      frame.hidden = true;
      status.hidden = false;
      status.textContent = 'The formula booklet could not load. ';
      var retry = doc.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Try again';
      retry.addEventListener('click', load);
      var link = doc.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open in a new tab';
      status.append(retry, link);
    }
    function load() {
      host.clearTimeout(timer);
      status.hidden = false;
      status.textContent = 'Loading formula booklet…';
      frame.hidden = true;
      frame.src = url;
      timer = host.setTimeout(failed, 15000);
    }
    frame.addEventListener('load', function () {
      if (active !== owner) return;
      try {
        if (frame.contentDocument.body.getAttribute('data-formula-booklet') !== course) return failed();
        host.clearTimeout(timer);
        status.hidden = true;
        frame.hidden = false;
        frame.contentWindow.scrollTo(0, positions[course] || 0);
      } catch { failed(); }
    });
    frame.addEventListener('error', failed);
    function message(event) {
      if (event.origin === origin && event.source === frame.contentWindow && event.data?.type === 'mrflynnib-formula-booklet-close') close();
    }
    function cleanup() {
      if (active !== owner) return;
      host.clearTimeout(timer);
      host.removeEventListener('message', message);
      window.removeEventListener('pagehide', close);
      root.style.overflow = previousOverflow;
      dialog.remove();
      active = null;
      if (button.isConnected) button.focus({ preventScroll: true });
    }
    dialog.querySelector('.qb-formula-close').addEventListener('click', close);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    dialog.addEventListener('close', cleanup);
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    doc.body.appendChild(dialog);
    host.addEventListener('message', message);
    window.addEventListener('pagehide', close);
    root.style.overflow = 'hidden';
    dialog.showModal();
    load();
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest?.('.qb-formula-open');
    if (!button) return;
    event.preventDefault();
    open(button);
  });
})();
