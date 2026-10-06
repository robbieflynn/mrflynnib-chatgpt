(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("assignment") !== "1" || window.parent === window) return;

  var MAX_SELECTED = 40;
  var selected = new Set();
  var configs = {};
  var style = document.createElement("style");
  style.textContent = [
    ".qb-header .qb-brand::after{content:' · Assignment builder';font-size:.72em;color:var(--ink-soft);font-weight:600}",
    ".qb-course-switch{display:none!important}",
    ".qb-progress-toggle{display:none!important}",
    ".qb-card{padding-top:0}",
    ".qb-assignment-select{margin:0 -18px 18px;padding:12px 18px;display:flex;align-items:center;gap:10px;background:#f3f9ff;border-bottom:1px solid #b9d5ef;border-radius:10px 10px 0 0;font:700 13px/1.2 var(--ui);color:var(--flynn-blue);cursor:pointer}",
    ".qb-assignment-select:hover{background:#e4f2ff}",
    ".qb-assignment-select input{width:19px;height:19px;margin:0;accent-color:var(--flynn-blue);cursor:pointer}",
    ".qb-card.qb-assignment-selected{outline:3px solid var(--flynn-blue);outline-offset:-2px}",
    ".qb-assignment-answer{margin:0 0 18px;padding:14px 16px;display:grid;gap:10px;border:1px solid #b9d5ef;border-radius:10px;background:#fbfdff;font:600 13px/1.4 var(--ui);color:#22364b}",
    ".qb-assignment-answer[hidden]{display:none}",
    ".qb-assignment-answer strong{color:var(--flynn-blue-dark);font-size:14px}",
    ".qb-assignment-answer label{display:grid;gap:5px}",
    ".qb-assignment-answer select,.qb-assignment-answer input[type=text],.qb-assignment-answer input[type=number]{min-height:40px;padding:8px 10px;border:1px solid #aebfc9;border-radius:7px;background:#fff;color:#15283b;font:500 14px/1.2 var(--ui)}",
    ".qb-assignment-answer small{color:#647789;font-weight:500}",
    ".qb-answer-options{display:grid;gap:7px}",
    ".qb-answer-option{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center}",
    ".qb-answer-option input[type=radio]{width:18px;height:18px;accent-color:var(--flynn-blue)}",
    ".qb-assignment-limit{position:fixed;left:50%;bottom:18px;z-index:100;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#9f2f2f;color:#fff;font:700 13px/1.2 var(--ui);box-shadow:0 8px 24px rgba(11,21,48,.22)}",
    "@media(max-width:480px){.qb-assignment-select{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}}"
  ].join("");
  document.head.appendChild(style);

  function publish() {
    window.parent.postMessage({
      type: "mrflynnib-assignment-selection",
      ids: Array.from(selected),
      configs: Array.from(selected).map(function (id) { return configs[id] || defaultConfig(); })
    }, window.location.origin);
  }

  function defaultConfig() {
    return { type: "teacher_review", acceptedAnswers: "", numericAnswer: "", tolerance: "0.01", options: ["", "", "", ""], correctOption: 0 };
  }

  function answerEditor(id) {
    if (!configs[id]) configs[id] = defaultConfig();
    var config = configs[id];
    var panel = document.createElement("div");
    panel.className = "qb-assignment-answer";
    panel.hidden = !selected.has(id);
    var heading = document.createElement("strong");
    heading.textContent = "How should this answer be checked?";
    var typeLabel = document.createElement("label");
    typeLabel.appendChild(document.createTextNode("Answer method"));
    var type = document.createElement("select");
    [
      ["teacher_review", "Teacher review (best for multi-part or complex answers)"],
      ["numeric", "Number with rounding tolerance"],
      ["exact", "Exact answer with accepted alternatives"],
      ["multiple_choice", "Multiple choice"]
    ].forEach(function (item) {
      var option = document.createElement("option");
      option.value = item[0]; option.textContent = item[1]; type.appendChild(option);
    });
    type.value = config.type;
    typeLabel.appendChild(type);
    var fields = document.createElement("div");
    fields.className = "qb-answer-fields";
    panel.appendChild(heading); panel.appendChild(typeLabel); panel.appendChild(fields);

    function textField(labelText, value, hint, onInput, inputType) {
      var label = document.createElement("label");
      label.appendChild(document.createTextNode(labelText));
      var input = document.createElement("input");
      input.type = inputType || "text"; input.value = value; input.addEventListener("input", function () { onInput(input.value); publish(); });
      label.appendChild(input);
      if (hint) { var small = document.createElement("small"); small.textContent = hint; label.appendChild(small); }
      return label;
    }

    function renderFields() {
      fields.innerHTML = "";
      if (config.type === "numeric") {
        fields.appendChild(textField("Correct numerical answer", config.numericAnswer, "Enter the unrounded value where possible.", function (value) { config.numericAnswer = value; }, "number"));
        fields.appendChild(textField("Allowed difference", config.tolerance, "For example, 0.01 accepts answers within 0.01 of the correct value.", function (value) { config.tolerance = value; }, "number"));
      } else if (config.type === "exact") {
        fields.appendChild(textField("Accepted answers", config.acceptedAnswers, "Separate alternatives with |, for example 1/2 | 0.5.", function (value) { config.acceptedAnswers = value; }));
      } else if (config.type === "multiple_choice") {
        var options = document.createElement("div"); options.className = "qb-answer-options";
        config.options.forEach(function (value, index) {
          var row = document.createElement("label"); row.className = "qb-answer-option";
          var correct = document.createElement("input"); correct.type = "radio"; correct.name = "correct-" + id; correct.checked = Number(config.correctOption) === index;
          correct.setAttribute("aria-label", "Mark option " + (index + 1) + " as correct");
          correct.addEventListener("change", function () { config.correctOption = index; publish(); });
          var optionText = document.createElement("input"); optionText.type = "text"; optionText.value = value; optionText.placeholder = "Option " + (index + 1);
          optionText.addEventListener("input", function () { config.options[index] = optionText.value; publish(); });
          row.appendChild(correct); row.appendChild(optionText); options.appendChild(row);
        });
        fields.appendChild(options);
        var hint = document.createElement("small"); hint.textContent = "Select the circle beside the correct option."; fields.appendChild(hint);
      } else {
        var note = document.createElement("small"); note.textContent = "The student can enter a final answer. It will be saved for you to review and will not be marked wrong automatically."; fields.appendChild(note);
      }
    }
    type.addEventListener("change", function () { config.type = type.value; renderFields(); publish(); });
    renderFields();
    return panel;
  }

  function showLimit() {
    var existing = document.querySelector(".qb-assignment-limit");
    if (existing) existing.remove();
    var notice = document.createElement("div");
    notice.className = "qb-assignment-limit";
    notice.setAttribute("role", "status");
    notice.textContent = "You can select up to 40 questions.";
    document.body.appendChild(notice);
    window.setTimeout(function () { notice.remove(); }, 2600);
  }

  function decorate(card) {
    if (!(card instanceof HTMLElement) || card.dataset.assignmentReady === "1") return;
    var id = card.dataset.id;
    if (!id) return;
    card.dataset.assignmentReady = "1";
    var label = document.createElement("label");
    label.className = "qb-assignment-select";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.has(id);
    checkbox.setAttribute("aria-label", "Add this question to the assignment");
    var copy = document.createElement("span");
    copy.textContent = checkbox.checked ? "Selected for assignment" : "Add to assignment";
    label.appendChild(checkbox);
    label.appendChild(copy);
    card.insertBefore(label, card.firstChild);
    var editor = answerEditor(id);
    label.insertAdjacentElement("afterend", editor);
    card.classList.toggle("qb-assignment-selected", checkbox.checked);

    checkbox.addEventListener("change", function () {
      if (checkbox.checked && selected.size >= MAX_SELECTED && !selected.has(id)) {
        checkbox.checked = false;
        showLimit();
        return;
      }
      if (checkbox.checked) selected.add(id);
      else selected.delete(id);
      copy.textContent = checkbox.checked ? "Selected for assignment" : "Add to assignment";
      card.classList.toggle("qb-assignment-selected", checkbox.checked);
      editor.hidden = !checkbox.checked;
      publish();
    });
  }

  function decorateAll() {
    document.querySelectorAll(".qb-card").forEach(decorate);
  }

  var list = document.getElementById("qb-list");
  if (list) new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
  decorateAll();
  publish();
})();
