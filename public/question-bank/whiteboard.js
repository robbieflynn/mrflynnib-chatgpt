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
    var actions = [];
    var activeStroke = null;
    var mode = 'pen';
    var colour = '#0d152e';
    var undo = board.querySelector('[data-whiteboard-action="undo"]');
    var clear = board.querySelector('[data-whiteboard-action="clear"]');

    function hasVisibleWork() {
      for (var i = actions.length - 1; i >= 0; i--) {
        if (actions[i].type === 'clear') return false;
        if (actions[i].type === 'stroke' || actions[i].type === 'image') return true;
      }
      return false;
    }

    function updateButtons() {
      undo.disabled = actions.length === 0;
      clear.disabled = !hasVisibleWork();
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

    function drawImage(action) {
      if (!action.image || !action.image.complete) return;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(
        action.image,
        action.x * canvas.clientWidth,
        action.y * canvas.clientHeight,
        action.width * canvas.clientWidth,
        action.height * canvas.clientHeight
      );
      ctx.restore();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / canvas.clientWidth, canvas.height / canvas.clientHeight);
      actions.forEach(function (action) {
        if (action.type === 'clear') ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        else if (action.type === 'image') drawImage(action);
        else drawStroke(action);
      });
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
      activeStroke = { type: 'stroke', mode: mode, colour: colour, points: [pointFromEvent(event)] };
      actions.push(activeStroke);
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
      if (action === 'undo' && actions.length) { actions.pop(); redraw(); updateButtons(); }
      if (action === 'clear' && hasVisibleWork()) {
        actions.push({ type: 'clear' });
        redraw();
        updateButtons();
      }
      if (action === 'close') open.click();
    });

    board.querySelector('.qb-whiteboard-colour').addEventListener('input', function (event) {
      colour = event.target.value;
      setMode('pen');
    });

    function importDiagram(svg) {
      if (board.hidden) open.click();
      var copy = svg.cloneNode(true);
      var sourceRect = svg.getBoundingClientRect();
      if (!copy.getAttribute('xmlns')) copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      if (!copy.getAttribute('width')) copy.setAttribute('width', Math.max(1, sourceRect.width));
      if (!copy.getAttribute('height')) copy.setAttribute('height', Math.max(1, sourceRect.height));
      var source = new XMLSerializer().serializeToString(copy);
      var url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
      var image = new Image();
      image.onload = function () {
        var surface = board.querySelector('.qb-whiteboard-surface');
        var availableWidth = Math.max(1, canvas.clientWidth * .84);
        var naturalWidth = image.naturalWidth || sourceRect.width || availableWidth;
        var naturalHeight = image.naturalHeight || sourceRect.height || 240;
        var scale = Math.min(1, availableWidth / naturalWidth, 380 / naturalHeight);
        var drawWidth = naturalWidth * scale;
        var drawHeight = naturalHeight * scale;
        var visibleTop = Math.max(18, board.scrollTop - surface.offsetTop + 24);
        var drawTop = Math.min(visibleTop, canvas.clientHeight - drawHeight - 18);
        actions.push({
          type: 'image',
          image: image,
          x: (canvas.clientWidth - drawWidth) / 2 / canvas.clientWidth,
          y: drawTop / canvas.clientHeight,
          width: drawWidth / canvas.clientWidth,
          height: drawHeight / canvas.clientHeight
        });
        URL.revokeObjectURL(url);
        redraw();
        updateButtons();
      };
      image.onerror = function () { URL.revokeObjectURL(url); };
      image.src = url;
    }

    function prepareDiagram(diagram) {
      if (diagram.getAttribute('data-whiteboard-source')) return;
      var svgs = diagram.querySelectorAll('svg');
      if (!svgs.length) return;
      diagram.setAttribute('data-whiteboard-source', '1');
      diagram.classList.add('qb-whiteboard-source');
      Array.prototype.forEach.call(svgs, function (svg) {
        svg.setAttribute('role', 'button');
        svg.setAttribute('tabindex', '0');
        svg.setAttribute('aria-label', 'Add this diagram to the whiteboard');
        svg.setAttribute('title', 'Add this diagram to the whiteboard');
      });
      var hint = document.createElement('span');
      hint.className = 'qb-diagram-copy-hint';
      hint.textContent = 'Click a diagram to add it to the whiteboard';
      diagram.appendChild(hint);
    }

    Array.prototype.forEach.call(card.querySelectorAll('.qb-diagram'), prepareDiagram);
    card.querySelector('.qb-question-pane').addEventListener('click', function (event) {
      var svg = event.target.closest && event.target.closest('.qb-diagram svg');
      if (svg) importDiagram(svg);
    });
    card.querySelector('.qb-question-pane').addEventListener('keydown', function (event) {
      var svg = event.target.closest && event.target.closest('.qb-diagram svg');
      if (svg && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        importDiagram(svg);
      }
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
