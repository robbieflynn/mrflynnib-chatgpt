(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  if (params.get("assignmentWork") !== "1" || window.parent === window) return;

  var view = params.get("assignmentView") || "step";
  var state = {};
  var orderedIds = [];
  var renderVersion = 0;
  var feedbackMode = "immediate";
  var assignmentSubmitted = false;
  var activeId = null;
  var list = document.getElementById("qb-list");
  if (!list) return;

  document.body.classList.add("qb-assignment-mode", "qb-assignment-" + view + "-mode");

  var style = document.createElement("style");
  style.textContent = [
    ".qb-assignment-mode .qb-header,.qb-assignment-mode .qb-controls{display:none!important}",
    ".qb-assignment-mode #qbank-root{padding-top:0}",
    ".qb-assignment-nav{margin:0 0 18px;padding:14px 16px;display:grid;gap:11px;border:1px solid #c9d7df;border-radius:14px;background:#fff;box-shadow:0 10px 28px rgba(13,21,46,.06);font-family:var(--ui)}",
    ".qb-assignment-nav-head{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#526b7c;font-size:12px;font-weight:750}",
    ".qb-assignment-nav-head strong{color:var(--flynn-blue-dark);font-size:14px}",
    ".qb-assignment-tabs{display:flex;gap:7px;overflow-x:auto;padding:2px 2px 5px;scrollbar-width:thin}",
    ".qb-assignment-tab{min-width:44px;height:40px;padding:0 10px;border:1px solid #c8d5dc;border-radius:10px;background:#f7fafb;color:#526b7c;font:800 13px/1 var(--ui);cursor:pointer}",
    ".qb-assignment-tab:hover{border-color:var(--flynn-blue);color:var(--flynn-blue-dark)}",
    ".qb-assignment-tab.is-active{border-color:var(--flynn-blue);background:var(--flynn-blue);color:#fff;box-shadow:0 6px 14px rgba(35,127,202,.2)}",
    ".qb-assignment-tab.is-correct:not(.is-active){border-color:#8fc9b2;background:#e8f6f0;color:#176b50}",
    ".qb-assignment-tab.is-incorrect:not(.is-active){border-color:#e4aaa6;background:#fff0ef;color:#9f2f2f}",
    ".qb-assignment-tab.is-review:not(.is-active){border-color:#a7c9e3;background:#edf6fc;color:#235f91}",
    ".qb-assignment-step-mode #qb-list>.qb-card:not(.qb-assignment-current){display:none!important}",
    ".qb-assignment-mode .qb-progress-toggle{display:none!important}",
    ".qb-assignment-response{margin-top:18px;padding:16px;display:grid;gap:11px;border:1px solid #bfd3df;border-radius:11px;background:linear-gradient(135deg,#f6fbff,#fff);font:600 14px/1.45 var(--ui);color:#203449}",
    ".qb-assignment-response-head{display:flex;align-items:center;justify-content:space-between;gap:12px}",
    ".qb-assignment-response-head strong{color:var(--flynn-blue-dark);font-size:15px}",
    ".qb-assignment-response-head span{padding:4px 8px;border-radius:999px;background:#e8f2f8;color:#526b7c;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}",
    ".qb-assignment-response input[type=text]{width:100%;min-height:44px;padding:10px 12px;border:1px solid #aabdc8;border-radius:8px;background:#fff;color:#13283c;font:500 15px/1.2 var(--ui)}",
    ".qb-assignment-response button{width:max-content;min-height:40px;padding:9px 14px;border:0;border-radius:8px;background:var(--flynn-blue);color:#fff;font:800 13px/1 var(--ui);cursor:pointer}",
    ".qb-assignment-response button:disabled{opacity:.6;cursor:not-allowed}",
    ".qb-response-options{display:grid;gap:8px}",
    ".qb-response-parts{display:grid;gap:10px}",
    ".qb-response-part{display:grid;grid-template-columns:38px 1fr;gap:8px;align-items:center}",
    ".qb-response-part strong{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#e8f2f8;color:var(--flynn-blue-dark)}",
    ".qb-response-option{padding:10px 12px;display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;border:1px solid #c8d5dc;border-radius:8px;background:#fff;cursor:pointer}",
    ".qb-response-option input{width:18px;height:18px;accent-color:var(--flynn-blue)}",
    ".qb-response-status{min-height:20px;color:#5f7180;font-size:13px}",
    ".qb-response-status.is-correct{color:#18704f}",
    ".qb-response-status.is-incorrect{color:#9f2f2f}",
    ".qb-assignment-response.is-readonly{background:#f7f8f9}",
    ".qb-response-readonly{padding:10px 12px;border-radius:8px;background:#fff;border:1px solid #d6dee2;white-space:pre-wrap}",
    ".qb-assignment-card-nav{padding-top:4px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #dce5e9}",
    ".qb-assignment-card-nav button{background:#fff;color:var(--flynn-blue-dark);border:1px solid #a9c8de}",
    ".qb-feedback-lock-note{margin-top:12px;padding:9px 11px;border-radius:8px;background:#f3f6f7;color:#60717d;font:650 12px/1.4 var(--ui)}",
    ".qb-assignment-feedback-locked .qb-ms-toggle,.qb-assignment-feedback-locked .qb-sol-toggle,.qb-assignment-feedback-locked .qb-markscheme,.qb-assignment-feedback-locked .qb-solution{display:none!important}",
    ".qb-assignment-detail-link{margin:0 0 12px auto;padding:8px 11px;display:block;border:1px solid #a9c8de;border-radius:8px;background:#fff;color:var(--flynn-blue-dark);font:800 12px/1 var(--ui);cursor:pointer}",
    ".qb-assignment-overview-mode #qb-list{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start;gap:16px!important}",
    ".qb-assignment-overview-mode #qb-list>.qb-card{min-width:0;margin:0!important;padding:15px!important;border-radius:14px!important;box-shadow:0 8px 24px rgba(13,21,46,.06)!important}",
    ".qb-assignment-overview-mode .qb-question-workspace,.qb-assignment-overview-mode .qb-card.qb-whiteboard-open .qb-question-workspace{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}",
    ".qb-assignment-overview-mode .qb-question-pane{max-height:250px;overflow:auto;padding-right:4px}",
    ".qb-assignment-overview-mode .qb-whiteboard-resizer,.qb-assignment-overview-mode .qb-whiteboard-tools,.qb-assignment-overview-mode .qb-whiteboard-open-button{display:none!important}",
    ".qb-assignment-overview-mode .qb-whiteboard-header{padding:8px 10px}",
    ".qb-assignment-overview-mode .qb-whiteboard-viewport{height:245px;max-height:245px!important;overflow:auto}",
    ".qb-assignment-overview-mode .qb-assignment-response{margin-top:10px;padding:11px}",
    ".qb-assignment-overview-mode .qb-response-readonly{max-height:92px;overflow:auto}",
    ".qb-assignment-detail-mode .qb-whiteboard-open-button{display:none}",
    "@media(max-width:720px){.qb-assignment-overview-mode #qb-list{grid-template-columns:1fr!important}.qb-assignment-response-head{align-items:flex-start;flex-direction:column}.qb-assignment-nav{padding:12px}}"
  ].join("");
  document.head.appendChild(style);

  var navigation = null;
  if (view === "step") {
    navigation = document.createElement("nav");
    navigation.className = "qb-assignment-nav";
    navigation.setAttribute("aria-label", "Assignment questions");
    list.parentNode.insertBefore(navigation, list);
  }

  var audioContext = null;
  function prepareAudio() {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch {}
  }

  function playFeedback(correct) {
    if (!audioContext) return;
    var now = audioContext.currentTime;
    var notes = correct ? [[523.25, 0], [659.25, .11], [783.99, .22]] : [[220, 0], [174.61, .16]];
    notes.forEach(function (note) {
      var oscillator = audioContext.createOscillator();
      var gain = audioContext.createGain();
      oscillator.type = correct ? "sine" : "triangle";
      oscillator.frequency.value = note[0];
      gain.gain.setValueAtTime(.0001, now + note[1]);
      gain.gain.exponentialRampToValueAtTime(correct ? .12 : .08, now + note[1] + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + note[1] + .18);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now + note[1]); oscillator.stop(now + note[1] + .2);
    });
  }

  function typeLabel(type) {
    if (type === "multiple_choice") return "Multiple choice";
    if (type === "numeric") return "Numerical answer";
    if (type === "exact") return "Exact answer";
    return "Teacher review";
  }

  function statusCopy(item) {
    if (!item.response) return "";
    if (item.isCorrect === true) return "Correct — well done!";
    if (item.isCorrect === false && Number(item.attemptCount || 0) >= 2) return "That was your second try. Your answer has been saved for your teacher.";
    if (item.isCorrect === false) return "Oops, that’s not right. Try again — you have one attempt left.";
    return item.readOnly ? "Saved for teacher review" : "Saved. Your teacher will review this answer.";
  }

  function responseText(item) {
    if (!item.response) return "No answer saved yet.";
    if (item.response.parts && typeof item.response.parts === "object") {
      return Object.keys(item.response.parts).map(function (label) { return "(" + label + ") " + String(item.response.parts[label] || ""); }).join("\n");
    }
    if (item.responseType === "multiple_choice") {
      var option = Number(item.response.option);
      return item.responseOptions[option] || "No answer saved yet.";
    }
    return String(item.response.text || "No answer saved yet.");
  }

  function isQuestionFinished(item) {
    if (!item) return false;
    if (item.responseType === "teacher_review") return Boolean(item.response);
    return item.isCorrect === true || Number(item.attemptCount || 0) >= 2;
  }

  function feedbackIsAvailable(item) {
    if (item && item.readOnly) return true;
    if (feedbackMode === "immediate") return true;
    if (feedbackMode === "after_assignment") return assignmentSubmitted;
    if (feedbackMode === "after_question") return isQuestionFinished(item);
    return false;
  }

  function feedbackLockedCopy() {
    if (feedbackMode === "hidden") return "Your teacher has kept the mark scheme and worked solution hidden.";
    if (feedbackMode === "after_assignment") return "The mark scheme and worked solution will unlock after you submit the assignment.";
    return "The mark scheme and worked solution will unlock after this question is completed.";
  }

  function questionState(item) {
    if (!item || !item.response) return "empty";
    if (item.isCorrect === true) return "correct";
    if (item.isCorrect === false) return "incorrect";
    return "review";
  }

  function goToQuestion(id, shouldScroll) {
    if (!state[id]) return;
    activeId = id;
    renderNavigation();
    document.querySelectorAll("#qb-list>.qb-card").forEach(function (card) {
      card.classList.toggle("qb-assignment-current", card.getAttribute("data-id") === activeId);
    });
    if (shouldScroll) window.parent.postMessage({ type: "mrflynnib-assignment-scroll-top" }, window.location.origin);
  }

  function renderNavigation() {
    if (!navigation) return;
    var visibleIds = orderedIds.filter(function (id) { return document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]'); });
    if (!activeId || visibleIds.indexOf(activeId) === -1) activeId = visibleIds.find(function (id) { return !isQuestionFinished(state[id]); }) || visibleIds[0] || null;
    navigation.replaceChildren();
    var head = document.createElement("div"); head.className = "qb-assignment-nav-head";
    var heading = document.createElement("strong"); heading.textContent = activeId ? "Question " + (orderedIds.indexOf(activeId) + 1) + " of " + orderedIds.length : "Assignment questions";
    var summary = document.createElement("span"); summary.textContent = orderedIds.filter(function (id) { return isQuestionFinished(state[id]); }).length + " completed";
    head.appendChild(heading); head.appendChild(summary); navigation.appendChild(head);
    var tabs = document.createElement("div"); tabs.className = "qb-assignment-tabs";
    orderedIds.forEach(function (id, index) {
      var button = document.createElement("button"); button.type = "button"; button.className = "qb-assignment-tab is-" + questionState(state[id]) + (id === activeId ? " is-active" : ""); button.textContent = "Q" + (index + 1); button.setAttribute("aria-label", "Open question " + (index + 1)); button.setAttribute("aria-current", id === activeId ? "step" : "false"); button.disabled = !document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
      button.addEventListener("click", function () { goToQuestion(id, true); }); tabs.appendChild(button);
    });
    navigation.appendChild(tabs);
  }

  function appendStepControls(panel, id) {
    if (view !== "step") return;
    var index = orderedIds.indexOf(id);
    var controls = document.createElement("div"); controls.className = "qb-assignment-card-nav";
    var previous = document.createElement("button"); previous.type = "button"; previous.textContent = "← Previous"; previous.disabled = index <= 0; previous.addEventListener("click", function () { goToQuestion(orderedIds[index - 1], true); });
    var next = document.createElement("button"); next.type = "button"; next.textContent = index >= orderedIds.length - 1 ? "Last question" : "Next →"; next.disabled = index >= orderedIds.length - 1; next.addEventListener("click", function () { goToQuestion(orderedIds[index + 1], true); });
    controls.appendChild(previous); controls.appendChild(next); panel.appendChild(controls);
  }

  function applyFeedbackPolicy(card, item) {
    var available = feedbackIsAvailable(item);
    card.classList.toggle("qb-assignment-feedback-locked", !available);
    var oldNote = card.querySelector(".qb-feedback-lock-note");
    if (available && oldNote) oldNote.remove();
    if (!available && !item.readOnly) {
      if (oldNote) {
        if (oldNote.textContent !== feedbackLockedCopy()) oldNote.textContent = feedbackLockedCopy();
      } else {
        var note = document.createElement("div"); note.className = "qb-feedback-lock-note"; note.textContent = feedbackLockedCopy();
        var pane = card.querySelector(".qb-question-pane") || card; pane.appendChild(note);
      }
    }
  }

  function addDetailButton(card, id) {
    if (view !== "overview" || card.querySelector(".qb-assignment-detail-link")) return;
    var button = document.createElement("button"); button.type = "button"; button.className = "qb-assignment-detail-link"; button.textContent = "Open question detail →";
    button.addEventListener("click", function () { window.parent.postMessage({ type: "mrflynnib-assignment-question-detail", questionId: id }, window.location.origin); });
    card.insertBefore(button, card.firstChild);
  }

  function openWhiteboardPreview(card) {
    if (view !== "overview" && view !== "detail") return;
    var item = state[card.dataset.id];
    if (!item || !item.readOnly || card.dataset.overviewWhiteboard === "1") return;
    var open = card.querySelector(".qb-whiteboard-open-button");
    if (!open) return;
    card.dataset.overviewWhiteboard = "1";
    if (open.getAttribute("aria-expanded") !== "true") open.click();
    if (view === "overview") {
      var zoomOut = card.querySelector('[data-whiteboard-action="zoom-out"]');
      if (zoomOut) { zoomOut.click(); zoomOut.click(); zoomOut.click(); }
    }
  }

  function decorate(card) {
    if (!(card instanceof HTMLElement)) return;
    var id = card.dataset.id;
    var item = state[id];
    var existing = card.querySelector(".qb-assignment-response");
    if (!item) { if (existing) existing.remove(); delete card.dataset.responseVersion; return; }
    applyFeedbackPolicy(card, item);
    addDetailButton(card, id);
    openWhiteboardPreview(card);
    if (card.dataset.responseVersion === String(renderVersion) && existing) return;
    if (existing) existing.remove();
    card.dataset.responseVersion = String(renderVersion);

    var panel = document.createElement("div"); panel.className = "qb-assignment-response" + (item.readOnly ? " is-readonly" : "");
    var head = document.createElement("div"); head.className = "qb-assignment-response-head";
    var heading = document.createElement("strong"); heading.textContent = item.readOnly ? "Student answer" : "Your answer";
    var kind = document.createElement("span"); kind.textContent = typeLabel(item.responseType);
    head.appendChild(heading); head.appendChild(kind); panel.appendChild(head);

    if (item.readOnly) {
      var saved = document.createElement("div"); saved.className = "qb-response-readonly"; saved.textContent = responseText(item); panel.appendChild(saved);
      var teacherStatus = document.createElement("div"); teacherStatus.className = "qb-response-status" + (item.isCorrect === true ? " is-correct" : item.isCorrect === false ? " is-incorrect" : ""); teacherStatus.textContent = statusCopy(item); panel.appendChild(teacherStatus);
      card.appendChild(panel); return;
    }

    var partLabels = Array.from(card.querySelectorAll(".qb-parts > li > b")).map(function (node) { return String(node.textContent || "").replace(/[()]/g, "").trim(); }).filter(Boolean);
    var isMultipart = item.responseType === "teacher_review" && partLabels.length > 1;
    var textInput = null;
    var partInputs = {};
    var selectedOption = item.response && Number.isInteger(Number(item.response.option)) ? Number(item.response.option) : null;
    if (isMultipart) {
      var parts = document.createElement("div"); parts.className = "qb-response-parts";
      partLabels.forEach(function (labelText, partIndex) {
        var row = document.createElement("label"); row.className = "qb-response-part";
        var partLabel = document.createElement("strong"); partLabel.textContent = "(" + labelText + ")";
        var input = document.createElement("input"); input.type = "text"; input.maxLength = 500; input.placeholder = "Enter your answer for part " + labelText;
        input.value = item.response && item.response.parts ? String(item.response.parts[labelText] || "") : (partIndex === 0 && item.response ? String(item.response.text || "") : "");
        partInputs[labelText] = input; row.appendChild(partLabel); row.appendChild(input); parts.appendChild(row);
      });
      panel.appendChild(parts);
    } else if (item.responseType === "multiple_choice") {
      var options = document.createElement("div"); options.className = "qb-response-options";
      item.responseOptions.forEach(function (optionText, index) {
        var label = document.createElement("label"); label.className = "qb-response-option";
        var radio = document.createElement("input"); radio.type = "radio"; radio.name = "answer-" + id; radio.checked = selectedOption === index;
        radio.addEventListener("change", function () { selectedOption = index; });
        var copy = document.createElement("span"); copy.textContent = optionText;
        label.appendChild(radio); label.appendChild(copy); options.appendChild(label);
      });
      panel.appendChild(options);
    } else {
      textInput = document.createElement("input"); textInput.type = "text"; textInput.maxLength = 500;
      textInput.placeholder = item.responseType === "numeric" ? "Enter a number" : "Enter your final answer";
      textInput.value = item.response ? String(item.response.text || "") : "";
      panel.appendChild(textInput);
    }

    var button = document.createElement("button"); button.type = "button"; button.textContent = item.responseType === "teacher_review" ? (isMultipart ? "Save answers" : "Save answer") : "Check answer";
    var status = document.createElement("div"); status.className = "qb-response-status" + (item.isCorrect === true ? " is-correct" : item.isCorrect === false ? " is-incorrect" : ""); status.textContent = statusCopy(item);
    var locked = item.responseType !== "teacher_review" && isQuestionFinished(item);
    if (locked) { button.disabled = true; panel.querySelectorAll("input").forEach(function (input) { input.disabled = true; }); }
    button.addEventListener("click", function () {
      prepareAudio();
      var response;
      if (isMultipart) {
        response = { parts: {} };
        Object.keys(partInputs).forEach(function (labelText) { response.parts[labelText] = partInputs[labelText].value; });
      } else response = item.responseType === "multiple_choice" ? { option: selectedOption } : { text: textInput ? textInput.value : "" };
      button.disabled = true; status.className = "qb-response-status"; status.textContent = "Saving…";
      window.parent.postMessage({ type: "mrflynnib-assignment-response-save", questionId: id, response: response }, window.location.origin);
    });
    panel.appendChild(button); panel.appendChild(status); appendStepControls(panel, id); card.appendChild(panel);
  }

  function reorderCards() {
    var cards = Array.from(list.children).filter(function (node) { return node.classList && node.classList.contains("qb-card") && state[node.getAttribute("data-id")]; });
    var currentOrder = cards.map(function (card) { return card.getAttribute("data-id"); });
    var targetOrder = orderedIds.filter(function (id) { return currentOrder.indexOf(id) !== -1; });
    if (currentOrder.join("\u0000") === targetOrder.join("\u0000")) return;
    targetOrder.forEach(function (id) {
      var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
      if (card && card.parentNode === list) list.appendChild(card);
    });
  }

  function decorateAll() {
    reorderCards();
    document.querySelectorAll(".qb-card").forEach(decorate);
    renderNavigation();
    if (view === "step") goToQuestion(activeId || orderedIds[0], false);
    window.setTimeout(function () { document.querySelectorAll(".qb-card").forEach(openWhiteboardPreview); }, 40);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
    if (event.data.type === "mrflynnib-assignment-response-state" && Array.isArray(event.data.questions)) {
      state = {};
      feedbackMode = String(event.data.feedbackMode || "immediate");
      assignmentSubmitted = Boolean(event.data.assignmentSubmitted);
      orderedIds = event.data.questions.slice().sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); }).map(function (item) { if (item && item.questionId) state[item.questionId] = item; return item && item.questionId; }).filter(Boolean);
      renderVersion += 1;
      decorateAll();
    }
    if (event.data.type === "mrflynnib-assignment-response-result") {
      var item = state[event.data.questionId];
      if (!item) return;
      if (event.data.ok) {
        item.response = event.data.response; item.isCorrect = event.data.isCorrect;
        if (event.data.result === "retry" || event.data.result === "incorrect_final" || event.data.result === "correct") item.attemptCount = Number(item.attemptCount || 0) + 1;
        if (event.data.result === "correct") playFeedback(true);
        if (event.data.result === "retry" || event.data.result === "incorrect_final") playFeedback(false);
      }
      renderVersion += 1;
      decorateAll();
      if (!event.data.ok) {
        var failed = document.querySelector('.qb-card[data-id="' + CSS.escape(event.data.questionId) + '"] .qb-response-status');
        if (failed) { failed.className = "qb-response-status is-incorrect"; failed.textContent = "That answer could not be saved. Please try again."; }
      }
    }
  });

  new MutationObserver(function () { window.requestAnimationFrame(decorateAll); }).observe(list, { childList: true, subtree: true });
  window.setTimeout(decorateAll, 0);
  window.setTimeout(decorateAll, 300);
  window.setTimeout(decorateAll, 1000);
  window.parent.postMessage({ type: "mrflynnib-assignment-responses-ready" }, window.location.origin);
}());
