(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("assignmentWork") !== "1" || window.parent === window) return;

  var state = {};
  var renderVersion = 0;
  var style = document.createElement("style");
  style.textContent = [
    ".qb-assignment-response{margin-top:18px;padding:16px;display:grid;gap:11px;border:1px solid #bfd3df;border-radius:11px;background:linear-gradient(135deg,#f6fbff,#fff);font:600 14px/1.45 var(--ui);color:#203449}",
    ".qb-assignment-response-head{display:flex;align-items:center;justify-content:space-between;gap:12px}",
    ".qb-assignment-response-head strong{color:var(--flynn-blue-dark);font-size:15px}",
    ".qb-assignment-response-head span{padding:4px 8px;border-radius:999px;background:#e8f2f8;color:#526b7c;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}",
    ".qb-assignment-response input[type=text]{width:100%;min-height:44px;padding:10px 12px;border:1px solid #aabdc8;border-radius:8px;background:#fff;color:#13283c;font:500 15px/1.2 var(--ui)}",
    ".qb-assignment-response button{width:max-content;min-height:40px;padding:9px 14px;border:0;border-radius:8px;background:var(--flynn-blue);color:#fff;font:800 13px/1 var(--ui);cursor:pointer}",
    ".qb-assignment-response button:disabled{opacity:.6;cursor:wait}",
    ".qb-response-options{display:grid;gap:8px}",
    ".qb-response-option{padding:10px 12px;display:grid;grid-template-columns:auto 1fr;gap:9px;align-items:center;border:1px solid #c8d5dc;border-radius:8px;background:#fff;cursor:pointer}",
    ".qb-response-option input{width:18px;height:18px;accent-color:var(--flynn-blue)}",
    ".qb-response-status{min-height:20px;color:#5f7180;font-size:13px}",
    ".qb-response-status.is-correct{color:#18704f}",
    ".qb-response-status.is-incorrect{color:#9f2f2f}",
    ".qb-assignment-response.is-readonly{background:#f7f8f9}",
    ".qb-response-readonly{padding:10px 12px;border-radius:8px;background:#fff;border:1px solid #d6dee2;white-space:pre-wrap}",
    "@media(max-width:480px){.qb-assignment-response-head{align-items:flex-start;flex-direction:column}}"
  ].join("");
  document.head.appendChild(style);

  function typeLabel(type) {
    if (type === "multiple_choice") return "Multiple choice";
    if (type === "numeric") return "Numerical answer";
    if (type === "exact") return "Exact answer";
    return "Teacher review";
  }

  function statusCopy(item) {
    if (!item.response) return "";
    if (item.isCorrect === true) return "Correct";
    if (item.isCorrect === false) return "Not quite. Check your working and try again.";
    return item.readOnly ? "Saved for teacher review" : "Saved. Your teacher will review this answer.";
  }

  function responseText(item) {
    if (!item.response) return "No answer saved yet.";
    if (item.responseType === "multiple_choice") {
      var option = Number(item.response.option);
      return item.responseOptions[option] || "No answer saved yet.";
    }
    return String(item.response.text || "No answer saved yet.");
  }

  function decorate(card) {
    if (!(card instanceof HTMLElement)) return;
    var id = card.dataset.id;
    var item = state[id];
    var existing = card.querySelector(".qb-assignment-response");
    if (!item) { if (existing) existing.remove(); delete card.dataset.responseVersion; return; }
    if (card.dataset.responseVersion === String(renderVersion) && existing) return;
    if (existing) existing.remove();
    card.dataset.responseVersion = String(renderVersion);

    var panel = document.createElement("div");
    panel.className = "qb-assignment-response" + (item.readOnly ? " is-readonly" : "");
    var head = document.createElement("div"); head.className = "qb-assignment-response-head";
    var heading = document.createElement("strong"); heading.textContent = item.readOnly ? "Student answer" : "Your answer";
    var kind = document.createElement("span"); kind.textContent = typeLabel(item.responseType);
    head.appendChild(heading); head.appendChild(kind); panel.appendChild(head);

    if (item.readOnly) {
      var saved = document.createElement("div"); saved.className = "qb-response-readonly"; saved.textContent = responseText(item); panel.appendChild(saved);
      var teacherStatus = document.createElement("div"); teacherStatus.className = "qb-response-status" + (item.isCorrect === true ? " is-correct" : item.isCorrect === false ? " is-incorrect" : ""); teacherStatus.textContent = statusCopy(item); panel.appendChild(teacherStatus);
      card.appendChild(panel); return;
    }

    var textInput = null;
    var selectedOption = item.response && Number.isInteger(Number(item.response.option)) ? Number(item.response.option) : null;
    if (item.responseType === "multiple_choice") {
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

    var button = document.createElement("button"); button.type = "button"; button.textContent = item.responseType === "teacher_review" ? "Save answer" : "Check answer";
    var status = document.createElement("div"); status.className = "qb-response-status" + (item.isCorrect === true ? " is-correct" : item.isCorrect === false ? " is-incorrect" : ""); status.textContent = statusCopy(item);
    button.addEventListener("click", function () {
      var response = item.responseType === "multiple_choice" ? { option: selectedOption } : { text: textInput ? textInput.value : "" };
      button.disabled = true; status.className = "qb-response-status"; status.textContent = "Saving…";
      window.parent.postMessage({ type: "mrflynnib-assignment-response-save", questionId: id, response: response }, window.location.origin);
    });
    panel.appendChild(button); panel.appendChild(status); card.appendChild(panel);
  }

  function decorateAll() { document.querySelectorAll(".qb-card").forEach(decorate); }
  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
    if (event.data.type === "mrflynnib-assignment-response-state" && Array.isArray(event.data.questions)) {
      state = {};
      event.data.questions.forEach(function (item) { if (item && item.questionId) state[item.questionId] = item; });
      renderVersion += 1;
      decorateAll();
    }
    if (event.data.type === "mrflynnib-assignment-response-result") {
      var item = state[event.data.questionId];
      if (!item) return;
      if (event.data.ok) { item.response = event.data.response; item.isCorrect = event.data.isCorrect; }
      renderVersion += 1;
      decorateAll();
    }
  });
  var list = document.getElementById("qb-list");
  if (list) new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
  window.parent.postMessage({ type: "mrflynnib-assignment-responses-ready" }, window.location.origin);
})();
