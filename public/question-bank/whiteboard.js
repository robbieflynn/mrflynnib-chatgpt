(function () {
  'use strict';

  var list = document.getElementById('qb-list');
  if (!list) return;

  function toolButton(action, label, pressed) {
    return '<button type="button" class="qb-whiteboard-tool" data-whiteboard-action="' + action + '"' +
      (pressed !== undefined ? ' aria-pressed="' + pressed + '"' : '') + '>' + label + '</button>';
  }

  function setupCard(card) {
    if (card.getAttribute('data-whiteboard-ready')) return;
    var body = card.querySelector('.qb-body');
    if (!body) return;
    card.setAttribute('data-whiteboard-ready', '1');

    var workspace = document.createElement('div');
    workspace.className = 'qb-question-workspace';
    var question = document.createElement('div');
    question.className = 'qb-question-pane';
    while (body.firstChild) question.appendChild(body.firstChild);

    var open = document.createElement('button');
    open.type = 'button';
    open.className = 'qb-whiteboard-open-button';
    open.textContent = 'Open whiteboard';
    open.setAttribute('aria-expanded', 'false');
    question.appendChild(open);

    var board = document.createElement('section');
    board.className = 'qb-whiteboard';
    board.hidden = true;
    board.setAttribute('aria-label', 'Working whiteboard');
    board.innerHTML =
      '<div class="qb-whiteboard-header">' +
        '<div class="qb-whiteboard-title">Working space <small>Not saved</small></div>' +
        '<div class="qb-whiteboard-tools" role="toolbar" aria-label="Whiteboard tools">' +
          toolButton('pen', 'Pen', true) +
          toolButton('eraser', 'Eraser', false) +
          '<input class="qb-whiteboard-colour" type="color" value="#0d152e" aria-label="Pen colour">' +
          toolButton('undo', 'Undo') +
          toolButton('clear', 'Clear') +
          '<button type="button" class="qb-whiteboard-tool qb-whiteboard-close" data-whiteboard-action="close" aria-label="Close whiteboard">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="qb-whiteboard-surface"><canvas class="qb-whiteboard-canvas" aria-label="Draw your working here"></canvas></div>';

    workspace.appendChild(question);
    workspace.appendChild(board);
    body.appendChild(workspace);
    initialiseBoard(card, open, board);
  }

  function initialiseBoard(card, open, board) {
    var canvas = board.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var strokes = [];
    var activeStroke = null;
    var mode = 'pen';
    var colour = '#0d152e';
    var undo = board.querySelector('[data-whiteboard-action="undo"]');
    var clear = board.querySelector('[data-whiteboard-action="clear"]');

    function updateButtons() {
      undo.disabled = strokes.length === 0;
      clear.disabled = strokes.length === 0;
    }

    function drawStroke(stroke) {
      if (!stroke.points.length) return;
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      ctx.save();
      ctx.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.colour;
      ctx.lineWidth = stroke.mode === 'eraser' ? 24 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);
      if (stroke.points.length === 1) ctx.lineTo(first.x * width + .01, first.y * height + .01);
      for (var i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
      }
      ctx.stroke();
      ctx.restore();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / canvas.clientWidth, canvas.height / canvas.clientHeight);
      strokes.forEach(drawStroke);
      ctx.restore();
    }

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      var height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      redraw();
    }

    function pointFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      };
    }

    canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      activeStroke = { mode: mode, colour: colour, points: [pointFromEvent(event)] };
      strokes.push(activeStroke);
      redraw();
      updateButtons();
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!activeStroke || !canvas.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      activeStroke.points.push(pointFromEvent(event));
      redraw();
    });

    function endStroke(event) {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      activeStroke = null;
    }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    function setMode(nextMode) {
      mode = nextMode;
      board.querySelector('[data-whiteboard-action="pen"]').setAttribute('aria-pressed', String(mode === 'pen'));
      board.querySelector('[data-whiteboard-action="eraser"]').setAttribute('aria-pressed', String(mode === 'eraser'));
    }

    open.addEventListener('click', function () {
      var willOpen = board.hidden;
      board.hidden = !willOpen;
      card.classList.toggle('qb-whiteboard-open', willOpen);
      open.textContent = willOpen ? 'Close whiteboard' : 'Open whiteboard';
      open.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) requestAnimationFrame(resize);
    });

    board.addEventListener('click', function (event) {
      var button = event.target.closest('[data-whiteboard-action]');
      if (!button) return;
      var action = button.getAttribute('data-whiteboard-action');
      if (action === 'pen' || action === 'eraser') setMode(action);
      if (action === 'undo' && strokes.length) { strokes.pop(); redraw(); updateButtons(); }
      if (action === 'clear' && strokes.length && window.confirm('Clear all work from this whiteboard?')) {
        strokes = [];
        redraw();
        updateButtons();
      }
      if (action === 'close') open.click();
    });

    board.querySelector('.qb-whiteboard-colour').addEventListener('input', function (event) {
      colour = event.target.value;
      setMode('pen');
    });

    window.addEventListener('resize', resize);
    updateButtons();
  }

  function scan() {
    Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), setupCard);
  }

  scan();
  // The bank appends cards after filter changes and load-more messages. These
  // hooks run after its own handlers, avoiding a permanent DOM observer across
  // thousands of questions.
  document.addEventListener('input', function () { window.setTimeout(scan, 0); });
  document.addEventListener('change', function () { window.setTimeout(scan, 0); });
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'mrflynnib-question-bank-load-more') {
      window.setTimeout(scan, 0);
    }
  });
}());
