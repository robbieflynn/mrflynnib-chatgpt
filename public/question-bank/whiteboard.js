(function () {
  'use strict';

  var list = document.getElementById('qb-list');
  if (!list) return;

  function toolButton(action, label, pressed) {
    return '<button type="button" class="qb-whiteboard-tool" data-whiteboard-action="' + action + '"' +
      (pressed !== undefined ? ' aria-pressed="' + pressed + '"' : '') + '>' + label + '</button>';
  }

  function colourButton(value, label, selected) {
    return '<button type="button" class="qb-whiteboard-colour" data-whiteboard-colour="' + value + '"' +
      ' aria-label="' + label + ' pen" aria-pressed="' + selected + '"' +
      ' style="--swatch:' + value + '"><span></span></button>';
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
          '<div class="qb-whiteboard-paper-tools" role="group" aria-label="Paper style">' +
            '<span>Paper</span>' +
            toolButton('squared-paper', 'Squared', true) +
            toolButton('blank-paper', 'Blank', false) +
          '</div>' +
          toolButton('pen', 'Pen', true) +
          toolButton('eraser', 'Eraser', false) +
          toolButton('pan', 'Pan', false) +
          '<div class="qb-whiteboard-colours" role="group" aria-label="Pen colour">' +
            colourButton('#0d152e', 'Black', true) +
            colourButton('#2563eb', 'Blue', false) +
            colourButton('#dc2626', 'Red', false) +
            colourButton('#15803d', 'Green', false) +
            colourButton('#7e22ce', 'Purple', false) +
            colourButton('#ea580c', 'Orange', false) +
          '</div>' +
          '<div class="qb-whiteboard-zoom-tools" role="group" aria-label="Whiteboard zoom">' +
            toolButton('zoom-out', '&minus;') +
            '<span class="qb-whiteboard-zoom-label" aria-live="polite">100%</span>' +
            toolButton('zoom-in', '+') +
          '</div>' +
          toolButton('expand', 'Expand', false) +
          toolButton('undo', 'Undo') +
          toolButton('clear', 'Clear') +
          '<button type="button" class="qb-whiteboard-tool qb-whiteboard-close" data-whiteboard-action="close" aria-label="Close whiteboard">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="qb-whiteboard-viewport">' +
        '<div class="qb-whiteboard-surface">' +
          '<canvas class="qb-whiteboard-image-layer" aria-hidden="true"></canvas>' +
          '<canvas class="qb-whiteboard-canvas" aria-label="Draw your working here"></canvas>' +
        '</div>' +
      '</div>';

    var resizer = document.createElement('div');
    resizer.className = 'qb-whiteboard-resizer';
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('tabindex', '0');
    resizer.setAttribute('aria-label', 'Drag to resize the whiteboard');
    resizer.setAttribute('aria-orientation', 'vertical');
    workspace.appendChild(question);
    workspace.appendChild(resizer);
    workspace.appendChild(board);
    body.appendChild(workspace);
    initialiseBoard(card, open, board, resizer);
  }

  function initialiseBoard(card, open, board, resizer) {
    var canvas = board.querySelector('.qb-whiteboard-canvas');
    var imageCanvas = board.querySelector('.qb-whiteboard-image-layer');
    var surface = board.querySelector('.qb-whiteboard-surface');
    var viewport = board.querySelector('.qb-whiteboard-viewport');
    var ctx = canvas.getContext('2d');
    var imageCtx = imageCanvas.getContext('2d');
    var actions = [];
    var activeStroke = null;
    var activePan = null;
    var straightTimer = null;
    var mode = 'pen';
    var colour = '#0d152e';
    var zoom = 1;
    var baseWidth = 1400;
    var baseHeight = 1120;
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
      imageCtx.save();
      imageCtx.globalCompositeOperation = 'source-over';
      imageCtx.drawImage(
        action.image,
        action.x * canvas.clientWidth,
        action.y * canvas.clientHeight,
        action.width * canvas.clientWidth,
        action.height * canvas.clientHeight
      );
      imageCtx.restore();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
      ctx.save();
      imageCtx.save();
      ctx.scale(canvas.width / canvas.clientWidth, canvas.height / canvas.clientHeight);
      imageCtx.scale(imageCanvas.width / imageCanvas.clientWidth, imageCanvas.height / imageCanvas.clientHeight);
      actions.forEach(function (action) {
        if (action.type === 'clear') {
          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
          imageCtx.clearRect(0, 0, imageCanvas.clientWidth, imageCanvas.clientHeight);
        }
        else if (action.type === 'image') drawImage(action);
        else drawStroke(action);
      });
      ctx.restore();
      imageCtx.restore();
    }

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      var height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      imageCanvas.width = width;
      imageCanvas.height = height;
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
      var pointerMode = event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32)) ? 'eraser' : mode;
      if (pointerMode === 'pan') {
        activePan = {
          x: event.clientX,
          y: event.clientY,
          left: viewport.scrollLeft,
          top: viewport.scrollTop
        };
        return;
      }
      activeStroke = { type: 'stroke', mode: pointerMode, colour: colour, points: [pointFromEvent(event)] };
      actions.push(activeStroke);
      redraw();
      updateButtons();
    });

    canvas.addEventListener('pointermove', function (event) {
      if (activePan && canvas.hasPointerCapture(event.pointerId)) {
        event.preventDefault();
        viewport.scrollLeft = activePan.left - (event.clientX - activePan.x);
        viewport.scrollTop = activePan.top - (event.clientY - activePan.y);
        return;
      }
      if (!activeStroke || !canvas.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      var point = pointFromEvent(event);
      if (activeStroke.straightened) activeStroke.points[1] = point;
      else activeStroke.points.push(point);
      redraw();
      window.clearTimeout(straightTimer);
      if (activeStroke.mode === 'pen' && activeStroke.points.length > 1) {
        straightTimer = window.setTimeout(function () {
          if (!activeStroke || activeStroke.mode !== 'pen') return;
          var first = activeStroke.points[0];
          var last = activeStroke.points[activeStroke.points.length - 1];
          var distance = Math.hypot((last.x - first.x) * canvas.clientWidth, (last.y - first.y) * canvas.clientHeight);
          if (distance < 24) return;
          activeStroke.straightened = true;
          activeStroke.points = [first, last];
          redraw();
        }, 500);
      }
    });

    function endStroke(event) {
      window.clearTimeout(straightTimer);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      activeStroke = null;
      activePan = null;
    }
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    function setMode(nextMode) {
      mode = nextMode;
      board.querySelector('[data-whiteboard-action="pen"]').setAttribute('aria-pressed', String(mode === 'pen'));
      board.querySelector('[data-whiteboard-action="eraser"]').setAttribute('aria-pressed', String(mode === 'eraser'));
      board.querySelector('[data-whiteboard-action="pan"]').setAttribute('aria-pressed', String(mode === 'pan'));
      canvas.classList.toggle('qb-whiteboard-panning', mode === 'pan');
    }

    function setPaper(style) {
      surface.classList.toggle('qb-paper-blank', style === 'blank');
      board.querySelector('[data-whiteboard-action="squared-paper"]').setAttribute('aria-pressed', String(style === 'squared'));
      board.querySelector('[data-whiteboard-action="blank-paper"]').setAttribute('aria-pressed', String(style === 'blank'));
    }

    function setZoom(nextZoom) {
      zoom = Math.max(.25, Math.min(2, nextZoom));
      surface.style.width = (baseWidth * zoom) + 'px';
      surface.style.height = (baseHeight * zoom) + 'px';
      board.querySelector('.qb-whiteboard-zoom-label').textContent = Math.round(zoom * 100) + '%';
      board.querySelector('[data-whiteboard-action="zoom-out"]').disabled = zoom <= .25;
      board.querySelector('[data-whiteboard-action="zoom-in"]').disabled = zoom >= 2;
      requestAnimationFrame(resize);
    }

    function setExpanded(expanded) {
      card.classList.toggle('qb-whiteboard-expanded', expanded);
      var button = board.querySelector('[data-whiteboard-action="expand"]');
      button.setAttribute('aria-pressed', String(expanded));
      button.textContent = expanded ? 'Collapse' : 'Expand';
      requestAnimationFrame(resize);
    }

    open.addEventListener('click', function () {
      var willOpen = board.hidden;
      board.hidden = !willOpen;
      card.classList.toggle('qb-whiteboard-open', willOpen);
      open.textContent = willOpen ? 'Close whiteboard' : 'Open whiteboard';
      open.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) requestAnimationFrame(resize);
      else setExpanded(false);
    });

    board.addEventListener('click', function (event) {
      var colourChoice = event.target.closest('[data-whiteboard-colour]');
      if (colourChoice) {
        colour = colourChoice.getAttribute('data-whiteboard-colour');
        Array.prototype.forEach.call(board.querySelectorAll('[data-whiteboard-colour]'), function (choice) {
          choice.setAttribute('aria-pressed', String(choice === colourChoice));
        });
        setMode('pen');
        return;
      }
      var button = event.target.closest('[data-whiteboard-action]');
      if (!button) return;
      var action = button.getAttribute('data-whiteboard-action');
      if (action === 'pen' || action === 'eraser' || action === 'pan') setMode(action);
      if (action === 'squared-paper') setPaper('squared');
      if (action === 'blank-paper') setPaper('blank');
      if (action === 'zoom-out') setZoom(zoom - .25);
      if (action === 'zoom-in') setZoom(zoom + .25);
      if (action === 'expand') setExpanded(!card.classList.contains('qb-whiteboard-expanded'));
      if (action === 'undo' && actions.length) { actions.pop(); redraw(); updateButtons(); }
      if (action === 'clear' && hasVisibleWork()) {
        actions.push({ type: 'clear' });
        redraw();
        updateButtons();
      }
      if (action === 'close') open.click();
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
        var availableWidth = Math.max(1, canvas.clientWidth * .84);
        var naturalWidth = image.naturalWidth || sourceRect.width || availableWidth;
        var naturalHeight = image.naturalHeight || sourceRect.height || 240;
        var scale = Math.min(1, availableWidth / naturalWidth, 380 / naturalHeight);
        var drawWidth = naturalWidth * scale;
        var drawHeight = naturalHeight * scale;
        var visibleTop = Math.max(18, viewport.scrollTop + 24);
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
    resizer.addEventListener('pointerdown', function (event) {
      if (window.matchMedia('(max-width: 820px)').matches) return;
      event.preventDefault();
      resizer.setPointerCapture(event.pointerId);
      var workspace = card.querySelector('.qb-question-workspace');
      var rect = workspace.getBoundingClientRect();
      function resizeBoard(moveEvent) {
        var boardWidth = Math.max(320, Math.min(rect.width - 280, rect.right - moveEvent.clientX));
        workspace.style.setProperty('--whiteboard-width', boardWidth + 'px');
        requestAnimationFrame(resize);
      }
      function finishResize(upEvent) {
        if (resizer.hasPointerCapture(upEvent.pointerId)) resizer.releasePointerCapture(upEvent.pointerId);
        resizer.removeEventListener('pointermove', resizeBoard);
        resizer.removeEventListener('pointerup', finishResize);
        resizer.removeEventListener('pointercancel', finishResize);
      }
      resizer.addEventListener('pointermove', resizeBoard);
      resizer.addEventListener('pointerup', finishResize);
      resizer.addEventListener('pointercancel', finishResize);
    });
    resizer.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var workspace = card.querySelector('.qb-question-workspace');
      var currentWidth = board.getBoundingClientRect().width;
      var direction = event.key === 'ArrowLeft' ? 40 : -40;
      var nextWidth = Math.max(320, Math.min(workspace.getBoundingClientRect().width - 280, currentWidth + direction));
      workspace.style.setProperty('--whiteboard-width', nextWidth + 'px');
      requestAnimationFrame(resize);
    });
    setZoom(1);
    updateButtons();
  }

  function scan() {
    Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), setupCard);
  }

  scan();
  // The self-contained bank hydrates its first batch asynchronously. Depending
  // on cache speed, that batch can arrive just after this shared script.
  window.setTimeout(scan, 0);
  window.setTimeout(scan, 250);
  window.setTimeout(scan, 1000);
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('.qb-card')) setupCard(node);
          Array.prototype.forEach.call(node.querySelectorAll ? node.querySelectorAll('.qb-card') : [], setupCard);
        });
      });
    }).observe(list, { childList: true, subtree: true });
  }
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
