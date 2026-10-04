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
        '<div class="qb-whiteboard-title">Working space <small class="qb-whiteboard-save-status">Not saved</small></div>' +
        '<div class="qb-whiteboard-tools" role="toolbar" aria-label="Whiteboard tools">' +
          '<div class="qb-whiteboard-paper-tools" role="group" aria-label="Paper style">' +
            '<span>Paper</span>' +
            toolButton('squared-paper', 'Squared', true) +
            toolButton('blank-paper', 'Blank', false) +
          '</div>' +
          toolButton('pen', 'Pen', true) +
          toolButton('eraser', 'Eraser', false) +
          toolButton('pan', 'Pan', false) +
          toolButton('move-image', 'Move image', false) +
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
    var questionId = card.getAttribute('data-id');
    var paperStyle = 'squared';
    var saveTimer = null;
    var loadRequested = false;
    var documentLoaded = false;
    var localDirty = false;
    var activeStroke = null;
    var activePan = null;
    var activeImage = null;
    var straightTimer = null;
    var activePointer = null;
    var activePointerType = null;
    var touches = new Map();
    var pinch = null;
    var touchGesture = false;
    var mode = 'pen';
    var colour = '#0d152e';
    var zoom = 1;
    var baseWidth = 1400;
    var baseHeight = 2240;
    var undo = board.querySelector('[data-whiteboard-action="undo"]');
    var clear = board.querySelector('[data-whiteboard-action="clear"]');
    var saveStatus = board.querySelector('.qb-whiteboard-save-status');
    canvas.tabIndex = 0;
    undo.setAttribute('aria-keyshortcuts', 'Meta+Z Control+Z');
    undo.title = 'Undo (Command+Z or Ctrl+Z)';

    function accountState() {
      return window.__mrflynnibAccountState || { configured: false, signedIn: false };
    }

    function setSaveStatus(text, state) {
      saveStatus.textContent = text;
      saveStatus.setAttribute('data-state', state || 'idle');
    }

    function updateAccountStatus() {
      var account = accountState();
      if (!account.configured) setSaveStatus('Saving coming soon', 'idle');
      else if (!account.signedIn) setSaveStatus('Sign in to save', 'idle');
      else if (!localDirty) setSaveStatus(documentLoaded ? 'Saved' : 'Ready to save', 'saved');
    }

    function serialiseDocument() {
      return {
        version: 1,
        paper: paperStyle,
        actions: actions.map(function (action) {
          if (action.type === 'clear') return { type: 'clear' };
          if (action.type === 'stroke') return {
            type: 'stroke',
            mode: action.mode === 'eraser' ? 'eraser' : 'pen',
            colour: action.colour,
            straightened: Boolean(action.straightened),
            points: action.points.map(function (point) { return { x: point.x, y: point.y }; })
          };
          return {
            type: 'image', source: action.source,
            x: action.x, y: action.y, width: action.width, height: action.height
          };
        })
      };
    }

    function scheduleSave() {
      localDirty = true;
      window.clearTimeout(saveTimer);
      if (!accountState().signedIn) {
        updateAccountStatus();
        return;
      }
      setSaveStatus('Saving…', 'saving');
      saveTimer = window.setTimeout(function () {
        window.parent.postMessage({
          type: 'mrflynnib-whiteboard-save',
          questionId: questionId,
          document: serialiseDocument()
        }, window.location.origin);
      }, 900);
    }

    function requestSavedDocument() {
      if (loadRequested || !accountState().signedIn) return;
      loadRequested = true;
      setSaveStatus('Loading saved work…', 'saving');
      window.parent.postMessage({ type: 'mrflynnib-whiteboard-load', questionId: questionId }, window.location.origin);
    }

    function capturePointer(id) {
      // Capture improves dragging outside the sheet, but is not a prerequisite
      // for drawing: pen drivers can release it during focus/tool transitions.
      try { canvas.setPointerCapture(id); } catch { /* window handlers remain active */ }
    }

    function releasePointer(id) {
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }

    function resetInteraction() {
      var ids = Array.from(touches.keys());
      if (activePointer !== null) ids.push(activePointer);
      window.clearTimeout(straightTimer);
      activeStroke = null;
      activePan = null;
      activeImage = null;
      activePointer = null;
      activePointerType = null;
      touches.clear();
      pinch = null;
      touchGesture = false;
      ids.forEach(releasePointer);
    }

    function undoLastAction() {
      if (!actions.length) return;
      resetInteraction();
      actions.pop();
      redraw();
      updateButtons();
      scheduleSave();
    }

    card.addEventListener('keydown', function (event) {
      if (board.hidden || event.defaultPrevented || event.isComposing ||
          !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey ||
          event.key.toLowerCase() !== 'z') return;
      if (event.target.isContentEditable || event.target.closest('input, textarea, select')) return;
      event.preventDefault();
      undoLastAction();
    });

    function hasVisibleWork() {
      for (var i = actions.length - 1; i >= 0; i--) {
        if (actions[i].type === 'clear') return false;
        if (actions[i].type === 'stroke' || actions[i].type === 'image') return true;
      }
      return false;
    }

    function visibleImages() {
      var images = [];
      actions.forEach(function (action) {
        if (action.type === 'clear') images = [];
        else if (action.type === 'image') images.push(action);
      });
      return images;
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
      // Tool widths are measured on the paper, so existing and new ink scale together.
      ctx.lineWidth = (stroke.mode === 'eraser' ? 24 : 3) * zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      var first = stroke.points[0];
      ctx.moveTo(first.x * width, first.y * height);
      if (stroke.points.length === 1) ctx.lineTo(first.x * width + .01 * zoom, first.y * height + .01);
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

    function startPinch() {
      var points = Array.from(touches.values()).slice(0, 2);
      var rect = canvas.getBoundingClientRect();
      var midX = (points[0].x + points[1].x) / 2;
      var midY = (points[0].y + points[1].y) / 2;
      pinch = {
        distance: Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)),
        zoom: zoom,
        x: (midX - rect.left) / rect.width,
        y: (midY - rect.top) / rect.height
      };
    }

    function cancelTouchAction() {
      window.clearTimeout(straightTimer);
      // The first finger may have started drawing before the second arrived.
      // Remove only that unfinished action, preserving all previous work.
      if (activeStroke) {
        var index = actions.indexOf(activeStroke);
        if (index >= 0) actions.splice(index, 1);
      }
      if (activeImage) {
        activeImage.action.x = activeImage.originalX;
        activeImage.action.y = activeImage.originalY;
      }
      activeStroke = null;
      activePan = null;
      activeImage = null;
      activePointer = null;
      activePointerType = null;
      redraw();
      updateButtons();
    }

    canvas.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (board.hidden) return;
      // A pen takes priority over a finger/palm that landed first. Never let
      // stale touch state lock out the next stylus stroke.
      if (event.pointerType === 'pen') {
        if (activePointerType === 'touch') cancelTouchAction();
        resetInteraction();
      } else if (event.pointerId === activePointer) {
        resetInteraction();
      }
      // Ignore palm contacts while a pen is drawing.
      if (event.pointerType === 'touch' && activePointerType === 'pen') return;
      if (event.pointerType !== 'touch' && (touchGesture || touches.size)) return;
      event.preventDefault();
      if (event.pointerType === 'touch') {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        capturePointer(event.pointerId);
        if (touches.size >= 2) {
          if (!touchGesture) cancelTouchAction();
          touchGesture = true;
          startPinch();
          return;
        }
        if (touchGesture) return;
      }
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      activePointerType = event.pointerType;
      canvas.focus({ preventScroll: true });
      capturePointer(event.pointerId);
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
      if (pointerMode === 'move-image') {
        var imagePoint = pointFromEvent(event);
        var images = visibleImages();
        for (var i = images.length - 1; i >= 0; i--) {
          var candidate = images[i];
          if (imagePoint.x >= candidate.x && imagePoint.x <= candidate.x + candidate.width &&
              imagePoint.y >= candidate.y && imagePoint.y <= candidate.y + candidate.height) {
            activeImage = {
              action: candidate,
              x: imagePoint.x,
              y: imagePoint.y,
              originalX: candidate.x,
              originalY: candidate.y
            };
            break;
          }
        }
        return;
      }
      activeStroke = { type: 'stroke', mode: pointerMode, colour: colour, points: [pointFromEvent(event)] };
      actions.push(activeStroke);
      redraw();
      updateButtons();
    });

    // Listen on the window as a fallback when pointer capture is unavailable.
    // The initiating pointer ID still owns the stroke, so hover cannot draw.
    window.addEventListener('pointermove', function (event) {
      if ((event.pointerType === 'pen' || event.pointerType === 'mouse') &&
          event.pointerId === activePointer && event.buttons === 0) {
        endStroke(event);
        return;
      }
      if (touches.has(event.pointerId)) {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touchGesture) {
          event.preventDefault();
          if (pinch && touches.size >= 2) {
            var points = Array.from(touches.values()).slice(0, 2);
            var distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
            var midX = (points[0].x + points[1].x) / 2;
            var midY = (points[0].y + points[1].y) / 2;
            setZoom(pinch.zoom * distance / pinch.distance);
            var rect = viewport.getBoundingClientRect();
            viewport.scrollLeft = pinch.x * baseWidth * zoom - (midX - rect.left - viewport.clientLeft);
            viewport.scrollTop = pinch.y * baseHeight * zoom - (midY - rect.top - viewport.clientTop);
          }
          return;
        }
      }
      if (event.pointerId !== activePointer) return;
      if (activePan) {
        event.preventDefault();
        viewport.scrollLeft = activePan.left - (event.clientX - activePan.x);
        viewport.scrollTop = activePan.top - (event.clientY - activePan.y);
        return;
      }
      if (activeImage) {
        event.preventDefault();
        var imagePoint = pointFromEvent(event);
        activeImage.action.x = Math.max(0, Math.min(1 - activeImage.action.width, activeImage.originalX + imagePoint.x - activeImage.x));
        activeImage.action.y = Math.max(0, Math.min(1 - activeImage.action.height, activeImage.originalY + imagePoint.y - activeImage.y));
        redraw();
        return;
      }
      if (!activeStroke) return;
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
      if (touches.has(event.pointerId)) {
        touches.delete(event.pointerId);
        if (touchGesture) {
          if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
          pinch = null;
          if (touches.size >= 2) startPinch();
          if (!touches.size) touchGesture = false;
          return;
        }
      }
      if (event.pointerId !== activePointer) return;
      var changed = Boolean(activeStroke || activeImage);
      activePointer = null;
      activePointerType = null;
      window.clearTimeout(straightTimer);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      activeStroke = null;
      activePan = null;
      activeImage = null;
      if (changed) scheduleSave();
    }
    window.addEventListener('pointerup', endStroke);
    window.addEventListener('pointercancel', endStroke);
    // Losing capture alone does not mean the pen has lifted. Keep accepting
    // matching moves until up/cancel, or clear on focus/visibility loss.
    window.addEventListener('blur', resetInteraction);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) resetInteraction();
    });

    function setMode(nextMode) {
      resetInteraction();
      mode = nextMode;
      board.querySelector('[data-whiteboard-action="pen"]').setAttribute('aria-pressed', String(mode === 'pen'));
      board.querySelector('[data-whiteboard-action="eraser"]').setAttribute('aria-pressed', String(mode === 'eraser'));
      board.querySelector('[data-whiteboard-action="pan"]').setAttribute('aria-pressed', String(mode === 'pan'));
      board.querySelector('[data-whiteboard-action="move-image"]').setAttribute('aria-pressed', String(mode === 'move-image'));
      canvas.classList.toggle('qb-whiteboard-panning', mode === 'pan');
      canvas.classList.toggle('qb-whiteboard-moving-image', mode === 'move-image');
    }

    function setPaper(style) {
      paperStyle = style === 'blank' ? 'blank' : 'squared';
      surface.classList.toggle('qb-paper-blank', style === 'blank');
      board.querySelector('[data-whiteboard-action="squared-paper"]').setAttribute('aria-pressed', String(style === 'squared'));
      board.querySelector('[data-whiteboard-action="blank-paper"]').setAttribute('aria-pressed', String(style === 'blank'));
      scheduleSave();
    }

    function setZoom(nextZoom) {
      zoom = Math.max(.25, Math.min(2, nextZoom));
      surface.style.width = (baseWidth * zoom) + 'px';
      surface.style.height = (baseHeight * zoom) + 'px';
      surface.style.backgroundSize = (24 * zoom) + 'px ' + (24 * zoom) + 'px';
      surface.style.setProperty('--whiteboard-grid-line', zoom + 'px');
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
      resetInteraction();
      var willOpen = board.hidden;
      board.hidden = !willOpen;
      card.classList.toggle('qb-whiteboard-open', willOpen);
      open.textContent = willOpen ? 'Close whiteboard' : 'Open whiteboard';
      open.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) requestAnimationFrame(resize);
      else setExpanded(false);
      if (willOpen) requestSavedDocument();
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
      if (action === 'pen' || action === 'eraser' || action === 'pan' || action === 'move-image') setMode(action);
      if (action === 'squared-paper') setPaper('squared');
      if (action === 'blank-paper') setPaper('blank');
      if (action === 'zoom-out') setZoom(zoom - .25);
      if (action === 'zoom-in') setZoom(zoom + .25);
      if (action === 'expand') setExpanded(!card.classList.contains('qb-whiteboard-expanded'));
      if (action === 'undo') undoLastAction();
      if (action === 'clear' && hasVisibleWork()) {
        actions.push({ type: 'clear' });
        redraw();
        updateButtons();
        scheduleSave();
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
        var drawLeft = (canvas.clientWidth - drawWidth) / 2;
        var placedImages = visibleImages();
        var overlap = true;
        while (overlap && drawTop + drawHeight <= canvas.clientHeight - 18) {
          overlap = false;
          for (var i = 0; i < placedImages.length; i++) {
            var placed = placedImages[i];
            var placedLeft = placed.x * canvas.clientWidth;
            var placedTop = placed.y * canvas.clientHeight;
            var placedRight = placedLeft + placed.width * canvas.clientWidth;
            var placedBottom = placedTop + placed.height * canvas.clientHeight;
            if (drawLeft < placedRight + 18 && drawLeft + drawWidth > placedLeft - 18 &&
                drawTop < placedBottom + 18 && drawTop + drawHeight > placedTop - 18) {
              drawTop = placedBottom + 24;
              overlap = true;
              break;
            }
          }
        }
        drawTop = Math.min(drawTop, canvas.clientHeight - drawHeight - 18);
        actions.push({
          type: 'image',
          image: image,
          source: source,
          x: drawLeft / canvas.clientWidth,
          y: drawTop / canvas.clientHeight,
          width: drawWidth / canvas.clientWidth,
          height: drawHeight / canvas.clientHeight
        });
        URL.revokeObjectURL(url);
        redraw();
        updateButtons();
        scheduleSave();
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
    updateAccountStatus();

    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
      if (event.data.type === 'mrflynnib-account-state') {
        updateAccountStatus();
        if (!board.hidden) requestSavedDocument();
        return;
      }
      if (String(event.data.questionId) !== questionId) return;
      if (event.data.type === 'mrflynnib-whiteboard-save-result') {
        if (event.data.ok) {
          localDirty = false;
          documentLoaded = true;
          setSaveStatus('Saved', 'saved');
        } else {
          setSaveStatus(event.data.reason === 'too-large' ? 'Too much to save' : 'Save failed', 'error');
        }
        return;
      }
      if (event.data.type === 'mrflynnib-whiteboard-data') {
        documentLoaded = true;
        if (!event.data.ok) {
          setSaveStatus('Could not load saved work', 'error');
          return;
        }
        if (!event.data.document || localDirty) {
          updateAccountStatus();
          if (localDirty) scheduleSave();
          return;
        }
        var stored = event.data.document;
        var storedActions = Array.isArray(stored.actions) ? stored.actions : [];
        var restored = [];
        storedActions.slice(0, 3000).forEach(function (action) {
          if (!action || typeof action !== 'object') return;
          if (action.type === 'clear') restored.push({ type: 'clear' });
          if (action.type === 'stroke' && Array.isArray(action.points)) {
            restored.push({
              type: 'stroke',
              mode: action.mode === 'eraser' ? 'eraser' : 'pen',
              colour: typeof action.colour === 'string' ? action.colour : '#0d152e',
              straightened: Boolean(action.straightened),
              points: action.points.slice(0, 10000).map(function (point) {
                return { x: Number(point.x) || 0, y: Number(point.y) || 0 };
              })
            });
          }
          if (action.type === 'image' && typeof action.source === 'string') {
            var restoredImage = new Image();
            var imageAction = {
              type: 'image', image: restoredImage, source: action.source,
              x: Number(action.x) || 0, y: Number(action.y) || 0,
              width: Number(action.width) || .5, height: Number(action.height) || .2
            };
            restoredImage.onload = redraw;
            restoredImage.src = action.source;
            restored.push(imageAction);
          }
        });
        actions = restored;
        setPaper(stored.paper === 'blank' ? 'blank' : 'squared');
        localDirty = false;
        window.clearTimeout(saveTimer);
        redraw();
        updateButtons();
        setSaveStatus('Saved', 'saved');
      }
    });
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
  // The bank appends cards after filter changes and load-more messages. These
  // hooks run after its own handlers and cover every append path without a
  // permanent DOM observer across thousands of questions.
  document.addEventListener('input', function () { window.setTimeout(scan, 0); });
  document.addEventListener('change', function () { window.setTimeout(scan, 0); });
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'mrflynnib-question-bank-load-more') {
      window.setTimeout(scan, 0);
    }
  });
}());
