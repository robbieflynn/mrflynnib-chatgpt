(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("assignment") !== "1" || window.parent === window) return;

  var MAX_SELECTED = 100;
  var draftId = String(params.get("draft") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  var draftKey = draftId ? "mrflynnib-assignment-draft:" + draftId : "";
  var restoredSelection = [];
  var configs = {};
  if (draftKey) {
    try {
      var storedDraft = JSON.parse(window.sessionStorage.getItem(draftKey) || "[]");
      var storedSelection = Array.isArray(storedDraft) ? storedDraft : storedDraft.ids;
      if (Array.isArray(storedSelection)) restoredSelection = storedSelection.map(String).filter(Boolean).slice(0, MAX_SELECTED);
      if (!Array.isArray(storedDraft) && storedDraft.configs && typeof storedDraft.configs === "object") configs = storedDraft.configs;
    } catch { restoredSelection = []; }
  }
  var selected = new Set(restoredSelection);
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
    ".qb-assignment-answer{margin:0 0 18px;padding:16px;display:grid;gap:12px;border:1px solid #b9d5ef;border-radius:10px;background:#fbfdff;font:600 13px/1.4 var(--ui);color:#22364b}",
    ".qb-assignment-answer[hidden]{display:none}",
    ".qb-assignment-answer strong{color:var(--flynn-blue-dark);font-size:14px}",
    ".qb-assignment-answer label{display:grid;gap:5px}",
    ".qb-assignment-answer select,.qb-assignment-answer input[type=text],.qb-assignment-answer input[type=number]{min-height:40px;padding:8px 10px;border:1px solid #aebfc9;border-radius:7px;background:#fff;color:#15283b;font:500 14px/1.2 var(--ui)}",
    ".qb-assignment-answer small{color:#647789;font-weight:500}",
    ".qb-answer-method-copy{display:block;margin-top:-5px;color:#647789;font-weight:500}",
    ".qb-accepted-answer-list{display:flex;flex-wrap:wrap;gap:7px}",
    ".qb-accepted-answer{padding:7px 10px;border:1px solid #b9d5ef;border-radius:999px;background:#fff;color:#173b5c;font:700 13px/1.2 var(--ui)}",
    ".qb-answer-source{padding:10px 12px;border-radius:8px;background:#edf7f1;color:#276247;font-weight:650}",
    ".qb-answer-review-note{padding:10px 12px;border-radius:8px;background:#fff7e7;color:#715317;font-weight:650}",
    ".qb-answer-options{display:grid;gap:7px}",
    ".qb-answer-option{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center}",
    ".qb-answer-option input[type=radio]{width:18px;height:18px;accent-color:var(--flynn-blue)}",
    ".qb-assignment-limit{position:fixed;left:50%;bottom:18px;z-index:100;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#9f2f2f;color:#fff;font:700 13px/1.2 var(--ui);box-shadow:0 8px 24px rgba(11,21,48,.22)}",
    "@media(max-width:480px){.qb-assignment-select{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}}"
  ].join("");
  document.head.appendChild(style);

  function publish() {
    var ids = Array.from(selected);
    var publishedConfigs = ids.map(function (id) {
      if (!configs[id]) configs[id] = defaultConfig(id);
      return configs[id];
    });
    if (draftKey) {
      var savedConfigs = {};
      ids.forEach(function (id, index) { savedConfigs[id] = publishedConfigs[index]; });
      try { window.sessionStorage.setItem(draftKey, JSON.stringify({ ids: ids, configs: savedConfigs })); } catch { /* session storage is optional */ }
    }
    window.parent.postMessage({
      type: "mrflynnib-assignment-selection",
      ids: ids,
      configs: publishedConfigs
    }, window.location.origin);
  }

  function questionFor(id) {
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    return card && card.mrflynnibQuestion ? card.mrflynnibQuestion : null;
  }

  function plainText(value) {
    var node = document.createElement("div");
    node.innerHTML = String(value || "").replace(/<br\s*\/?>/gi, " ");
    return String(node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function latexToPlain(value) {
    var text = String(value || "")
      .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
      .replace(/\\left|\\right/g, "")
      .replace(/(\d+)\s*\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1 $2/$3")
      .replace(/(\d+)\s*\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1 $2/$3")
      .replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
      .replace(/\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1/$2")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\operatorname\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
      .replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\infty/g, "∞")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/\\therefore/g, "").replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ").trim();
    return plainText(text).replace(/^=\s*/, "").trim();
  }

  function addAnswer(list, value) {
    var answer = latexToPlain(value).replace(/[.;,]+$/, "").trim();
    if (!answer || answer.length > 140) return;
    if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
    var choices = answer.split(/\s+or\s+/i).filter(Boolean);
    if (choices.length > 1) {
      choices.forEach(function (choice) { addAnswer(list, choice); });
      return;
    }
    if (answer.indexOf("=") > 0 && !/[<>&≤≥]/.test(answer)) {
      var rightSide = answer.slice(answer.lastIndexOf("=") + 1).trim();
      if (rightSide && rightSide.length < answer.length) addAnswer(list, rightSide);
    }
    var key = answer.toLowerCase().replace(/\s+/g, "");
    if (!list.some(function (item) { return item.toLowerCase().replace(/\s+/g, "") === key; })) list.push(answer);
    var keyboardForm = answer.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/π/g, "pi").replace(/×/g, "*").replace(/·/g, "*");
    if (keyboardForm !== answer && !list.some(function (item) { return item.toLowerCase().replace(/\s+/g, "") === keyboardForm.toLowerCase().replace(/\s+/g, ""); })) list.push(keyboardForm);
    var fraction = answer.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (fraction && Number(fraction[2]) !== 0) {
      var decimal = Number(fraction[1]) / Number(fraction[2]);
      if (Number.isFinite(decimal)) {
        var decimalText = String(Number(decimal.toFixed(10)));
        if (!list.some(function (item) { return item === decimalText; })) list.push(decimalText);
      }
    }
  }

  function mathFragments(value) {
    var fragments = [];
    var source = String(value || "");
    var match;
    var pattern = /\\\(([\s\S]*?)\\\)/g;
    while ((match = pattern.exec(source))) fragments.push(match[1]);
    return fragments;
  }

  function automaticAnswers(question) {
    if (!question || !Array.isArray(question.markscheme) || question.markscheme.length !== 1) return [];
    if (Array.isArray(question.parts) && question.parts.length > 1) return [];
    if (question.answerDiagram || question.answerDiagram2) return [];
    var prompt = plainText((question.title || "") + " " + (question.body || "") + " " + (Array.isArray(question.parts) ? question.parts.map(function (part) { return part[1] || ""; }).join(" ") : ""));
    if (/\b(show that|prove|sketch|draw|explain|justify|give a reason|write down the steps)\b/i.test(prompt)) return [];
    var rows = Array.isArray(question.markscheme[0][1]) ? question.markscheme[0][1] : [];
    var answerRows = rows.filter(function (row) {
      return Array.isArray(row) && /(?:^|[()])(?:A|B|M)\d/.test(String(row[1] || "")) && mathFragments(row[0]).length;
    });
    if (!answerRows.length) return [];
    var answers = [];
    var finalContent = String(answerRows[answerRows.length - 1][0] || "");
    var alternatives = finalContent.split(/<br\s*\/?>\s*<b>\s*(?:OR|or)\s*<\/b>\s*<br\s*\/?>/i);
    alternatives.forEach(function (alternative) {
      var maths = mathFragments(alternative);
      if (maths.length) addAnswer(answers, maths[maths.length - 1]);
      else addAnswer(answers, plainText(alternative));
    });
    rows.forEach(function (row) {
      var content = String(Array.isArray(row) ? row[0] || "" : "");
      var noteText = plainText(content);
      if (!/\b(?:accept|allow)\b/i.test(noteText) && !/^Note:\s*for\b/i.test(noteText)) return;
      mathFragments(content).forEach(function (fragment) { addAnswer(answers, fragment); });
    });
    return answers.slice(0, 12);
  }

  function numericValue(answers) {
    for (var i = 0; i < answers.length; i += 1) {
      var compact = String(answers[i]).replace(/,/g, "").trim();
      if (/^-?\d+(?:\.\d+)?$/.test(compact)) return compact;
      var fraction = compact.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
      if (fraction && Number(fraction[2]) !== 0) return String(Number(fraction[1]) / Number(fraction[2]));
    }
    return "";
  }

  function defaultConfig(id) {
    var question = questionFor(id);
    var acceptedAnswers = automaticAnswers(question);
    return {
      type: acceptedAnswers.length ? "exact" : "teacher_review",
      acceptedAnswers: acceptedAnswers,
      numericAnswer: numericValue(acceptedAnswers),
      tolerance: "0.01",
      options: ["", "", "", ""],
      correctOption: 0,
      provisional: !question
    };
  }

  function answerEditor(id) {
    if (!configs[id] || configs[id].provisional) configs[id] = defaultConfig(id);
    var config = configs[id];
    var panel = document.createElement("div");
    panel.className = "qb-assignment-answer";
    panel.hidden = !selected.has(id);
    var heading = document.createElement("strong");
    heading.textContent = "Automatic answer checking";
    var methodCopy = document.createElement("small");
    methodCopy.className = "qb-answer-method-copy";
    var fields = document.createElement("div");
    fields.className = "qb-answer-fields";
    panel.appendChild(heading); panel.appendChild(methodCopy); panel.appendChild(fields);

    function renderFields() {
      fields.innerHTML = "";
      if (config.type === "exact") {
        methodCopy.textContent = "Recommended. Checks the final answer against every accepted form supplied by the mark scheme.";
        var source = document.createElement("div"); source.className = "qb-answer-source"; source.textContent = "Accepted automatically from the official mark scheme"; fields.appendChild(source);
        var accepted = document.createElement("div"); accepted.className = "qb-accepted-answer-list";
        config.acceptedAnswers.forEach(function (answer) { var chip = document.createElement("span"); chip.className = "qb-accepted-answer"; chip.textContent = answer; accepted.appendChild(chip); });
        fields.appendChild(accepted);
        var exactHint = document.createElement("small"); exactHint.textContent = "Equivalent alternatives shown in the mark scheme are included. The teacher does not need to type an answer."; fields.appendChild(exactHint);
      } else {
        methodCopy.textContent = "Nothing to choose or enter — the student’s response and whiteboard will be saved automatically.";
        var note = document.createElement("div"); note.className = "qb-answer-review-note"; note.textContent = "This is a proof, diagram, multi-part question, or has no single safe exact answer. It will be saved for teacher review automatically."; fields.appendChild(note);
        var reviewHint = document.createElement("small"); reviewHint.textContent = "Students can still enter their answers and use the whiteboard. Their work will be saved for you to review."; fields.appendChild(reviewHint);
      }
    }
    renderFields();
    return panel;
  }

  function showLimit() {
    var existing = document.querySelector(".qb-assignment-limit");
    if (existing) existing.remove();
    var notice = document.createElement("div");
    notice.className = "qb-assignment-limit";
    notice.setAttribute("role", "status");
    notice.textContent = "You can select up to 100 questions.";
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
    publish();
  }

  var list = document.getElementById("qb-list");
  if (list) new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
  decorateAll();
  publish();
})();
