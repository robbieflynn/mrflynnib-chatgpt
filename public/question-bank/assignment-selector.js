(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("assignment") !== "1" || window.parent === window) return;

  var MAX_SELECTED = 100;
  var DRAFT_VERSION = 11;
  var choiceUtils = window.MrFlynnAssignmentChoices;
  var draftId = String(params.get("draft") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  var draftKey = draftId ? "mrflynnib-assignment-draft:" + draftId : "";
  var restoredSelection = [];
  var configs = {};
  var summaries = {};
  if (draftKey) {
    try {
      var storedDraft = JSON.parse(window.sessionStorage.getItem(draftKey) || "[]");
      var storedSelection = Array.isArray(storedDraft) ? storedDraft : storedDraft.ids;
      if (Array.isArray(storedSelection)) restoredSelection = storedSelection.map(String).filter(Boolean).slice(0, MAX_SELECTED);
      if (!Array.isArray(storedDraft) && storedDraft.version >= DRAFT_VERSION && storedDraft.configs && typeof storedDraft.configs === "object") configs = storedDraft.configs;
      if (!Array.isArray(storedDraft) && storedDraft.summaries && typeof storedDraft.summaries === "object") summaries = storedDraft.summaries;
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
    ".qb-answer-part-list{display:grid;gap:8px}",
    ".qb-answer-part-row{padding:10px;display:grid;grid-template-columns:minmax(54px,auto) 1fr;align-items:start;gap:10px;border:1px solid #d5e1e7;border-radius:9px;background:#fff}",
    ".qb-answer-part-row>strong{padding-top:6px;color:var(--flynn-blue-dark)}",
    ".qb-answer-part-row .qb-answer-review-note{display:block;padding:7px 9px}",
    ".qb-answer-choice-list{display:grid;gap:6px}",
    ".qb-answer-choice{padding:7px 9px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #d5e1e7;border-radius:8px;background:#f8fafb;color:#29445a;font-weight:650}",
    ".qb-answer-choice.is-correct{border-color:#8fc9b2;background:#eaf7f1;color:#176b50}",
    ".qb-answer-choice small{padding:3px 6px;border-radius:999px;background:#fff;color:#176b50;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}",
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
    var publishedSummaries = ids.map(function (id) {
      summaries[id] = questionSummary(id);
      return summaries[id];
    });
    if (draftKey) {
      var savedConfigs = {};
      var savedSummaries = {};
      ids.forEach(function (id, index) {
        savedConfigs[id] = publishedConfigs[index];
        savedSummaries[id] = publishedSummaries[index];
      });
      try { window.sessionStorage.setItem(draftKey, JSON.stringify({ version: DRAFT_VERSION, ids: ids, configs: savedConfigs, summaries: savedSummaries })); } catch { /* session storage is optional */ }
    }
    window.parent.postMessage({
      type: "mrflynnib-assignment-selection",
      ids: ids,
      configs: publishedConfigs,
      summaries: publishedSummaries
    }, window.location.origin);
  }

  function clearSelection() {
    selected.clear();
    configs = {};
    summaries = {};
    if (draftKey) {
      try { window.sessionStorage.removeItem(draftKey); } catch { /* session storage is optional */ }
    }
    document.querySelectorAll(".qb-card").forEach(function (card) {
      var checkbox = card.querySelector(".qb-assignment-select input[type=checkbox]");
      var copy = card.querySelector(".qb-assignment-select span");
      var editor = card.querySelector(".qb-assignment-answer");
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to assignment";
      if (editor) editor.hidden = true;
      card.classList.remove("qb-assignment-selected");
    });
    publish();
  }

  function removeSelection(id) {
    selected.delete(id);
    delete configs[id];
    delete summaries[id];
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    if (card) {
      var checkbox = card.querySelector(".qb-assignment-select input[type=checkbox]");
      var copy = card.querySelector(".qb-assignment-select span");
      var editor = card.querySelector(".qb-assignment-answer");
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to assignment";
      if (editor) editor.hidden = true;
      card.classList.remove("qb-assignment-selected");
    }
    publish();
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data && event.data.type === "mrflynnib-assignment-clear") clearSelection();
    if (event.data && event.data.type === "mrflynnib-assignment-remove") removeSelection(String(event.data.id || ""));
  });

  function questionFor(id) {
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    return card && card.mrflynnibQuestion ? card.mrflynnibQuestion : null;
  }

  function questionSummary(id) {
    var existing = summaries[id];
    var question = questionFor(id);
    if (!question) return existing || { id: id, title: "Selected question" };
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    var text = function (selector) {
      var node = card && card.querySelector(selector);
      return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
    };
    return {
      id: id,
      title: plainText(question.title) || existing && existing.title || "Selected question",
      topic: text(".qb-badge.topic .main") || existing && existing.topic || "",
      subtopic: text(".qb-badge.topic .subs") || existing && existing.subtopic || "",
      paper: text(".qb-badge.course") || existing && existing.paper || "",
      difficulty: text(".qb-badge:not(.course):not(.topic):not(.marks)") || existing && existing.difficulty || "",
      marks: Number(question.marks) || existing && existing.marks || null
    };
  }

  function plainText(value) {
    var node = document.createElement("div");
    node.innerHTML = String(value || "").replace(/<br\s*\/?>/gi, " ");
    return String(node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function latexToPlain(value) {
    if (choiceUtils && choiceUtils.latexToPlain) return choiceUtils.latexToPlain(value);
    var text = String(value || "")
      .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
      .replace(/\\left|\\right/g, "")
      .replace(/(\d+)\s*\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1 $2/$3")
      .replace(/(\d+)\s*\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1 $2/$3")
      .replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
      .replace(/\\(?:d?frac)\s*(\d)\s*(\d)/g, "$1/$2")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\operatorname\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
      .replace(/\^\s*\\circ/g, "°").replace(/\\circ/g, "°")
      .replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\infty/g, "∞")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/\\therefore/g, "").replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ").trim();
    return plainText(text).replace(/^=\s*/, "").trim();
  }

  function addAnswer(list, value) {
    var plainAnswer = latexToPlain(value).replace(/\\(?=\s|\(|\)|$)/g, "").replace(/[.;,]+$/, "").trim();
    var answer = choiceUtils && choiceUtils.clean ? choiceUtils.clean(plainAnswer) : plainAnswer;
    if (!answer || answer.length > 140) return;
    if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
    if (/^(?:[a-df-hj-z]|theta|alpha|beta|gamma|dx|dy\/dx|dm\/dt|cos\s*theta|sin\s*theta)$/i.test(answer)) return;
    var approximate = answer.match(/^(.+?)\s*\(\s*=\s*(.+?)\s*\)$/);
    if (approximate) {
      addAnswer(list, approximate[1]);
      addAnswer(list, approximate[2]);
      return;
    }
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
  }

  function mathFragments(value) {
    var fragments = [];
    var source = String(value || "");
    var match;
    var pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
    while ((match = pattern.exec(source))) fragments.push(match[1] !== undefined ? match[1] : match[2]);
    return fragments;
  }

  function requiresWhiteboard(prompt) {
    return /\b(show that|prove|sketch|draw|construct|plot|explain|justify|give a reason|giving a reason|state a reason|write down the steps|show your working|describe|discuss|interpret|comment on)\b/i.test(plainText(prompt));
  }

  function automaticAnswersFromRows(rows, prompt) {
    if (choiceUtils && choiceUtils.extractAcceptedAnswers) return choiceUtils.extractAcceptedAnswers(rows, prompt);
    if (!Array.isArray(rows) || requiresWhiteboard(prompt)) return [];
    var answerRows = rows.filter(function (row) {
      return Array.isArray(row)
        && /(?:A\d|B\d|M\d|R\d|G\d|N\d|E\d|AG)/.test(String(row[1] || ""))
        && (mathFragments(row[0]).length || /(?:^|\s)[-+]?\d+(?:\.\d+)?(?:\s|$|[),])/i.test(plainText(row[0])));
    });
    if (!answerRows.length) return [];
    var answers = [];
    var finalContent = String(answerRows[answerRows.length - 1][0] || "");
    var alternatives = finalContent.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|\s+or\s+)/i);
    var unsafeAlternative = alternatives.some(function (alternative) {
      var maths = mathFragments(alternative);
      return maths.length > 1 || (maths.length === 1 && (maths[0].match(/=/g) || []).length > 3);
    });
    if (unsafeAlternative) return [];
    alternatives.forEach(function (alternative) {
      var maths = mathFragments(alternative);
      if (maths.length === 1 && !/^[a-z]$/i.test(latexToPlain(maths[0]))) addAnswer(answers, maths[0]);
      else if (maths.length === 0 || (maths.length === 1 && /^[a-z]$/i.test(latexToPlain(maths[0])))) {
        var textAnswer = plainText(alternative);
        var numbers = textAnswer.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g) || [];
        if (numbers.length === 1) addAnswer(answers, numbers[0]);
        else if (numbers.length > 1 && textAnswer.length <= 100) addAnswer(answers, textAnswer);
        else addAnswer(answers, textAnswer);
      }
    });
    return answers.slice(0, 12);
  }

  function romanSubparts(prompt) {
    var labels = [];
    var pattern = /\(([ivxlcdm]+)\)/gi;
    var match;
    while ((match = pattern.exec(plainText(prompt)))) {
      var label = match[1].toLowerCase();
      if (labels.indexOf(label) === -1) labels.push(label);
    }
    return labels.indexOf("i") !== -1 && labels.indexOf("ii") !== -1 ? labels : [];
  }

  function rowsForSubpart(rows, label) {
    var start = -1;
    var end = rows.length;
    rows.forEach(function (row, index) {
      var match = plainText(Array.isArray(row) ? row[0] : "").match(/^\s*\(([ivxlcdm]+)\)/i);
      if (!match) return;
      if (match[1].toLowerCase() === label && start === -1) start = index;
      else if (start !== -1 && index > start && end === rows.length) end = index;
    });
    return start === -1 ? [] : rows.slice(start, end);
  }

  function promptForSubpart(prompt, label) {
    var source = plainText(prompt);
    var marker = new RegExp("\\(" + label + "\\)", "i");
    var start = source.search(marker);
    if (start === -1) return source;
    var remainder = source.slice(start + label.length + 2);
    var next = remainder.search(/\(([ivxlcdm]+)\)/i);
    return next === -1 ? remainder : remainder.slice(0, next);
  }

  function automaticPartConfigs(question) {
    if (!question || !Array.isArray(question.markscheme)) return [];
    var markschemeByPart = {};
    question.markscheme.forEach(function (group) {
      if (!Array.isArray(group)) return;
      markschemeByPart[String(group[0] || "").toLowerCase()] = Array.isArray(group[1]) ? group[1] : [];
    });
    var questionParts = Array.isArray(question.parts) && question.parts.length
      ? question.parts
      : [["", (question.body || question.title || ""), question.marks]];
    var results = [];
    questionParts.forEach(function (part) {
      var topLabel = String(part[0] || "").toLowerCase();
      var prompt = String(part[1] || "");
      var rows = markschemeByPart[topLabel] || [];
      var nested = romanSubparts(prompt);
      if (nested.length) {
        nested.forEach(function (nestedLabel) {
          var nestedPrompt = promptForSubpart(prompt, nestedLabel);
          var nestedRows = rowsForSubpart(rows, nestedLabel);
          if (!nestedRows.length) nestedRows = rows;
          var answers = automaticAnswersFromRows(nestedRows, nestedPrompt);
          var label = topLabel ? topLabel + "(" + nestedLabel + ")" : nestedLabel;
          var choices = choiceUtils && choiceUtils.generateParityChoiceSet && choiceUtils.generateParityChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!choices) choices = choiceUtils && choiceUtils.generateChoiceSet(answers, String(question.id || "") + ":" + label);
          results.push({ label: label, mode: choices ? "multiple_choice" : "whiteboard", acceptedAnswers: choices ? choices.acceptedAnswers : [], options: choices ? choices.options : [], correctOption: choices ? choices.correctOption : null });
        });
      } else {
        var answers = automaticAnswersFromRows(rows, prompt);
        var label = topLabel || "answer";
        var choices = choiceUtils && choiceUtils.generateParityChoiceSet && choiceUtils.generateParityChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!choices) choices = choiceUtils && choiceUtils.generateChoiceSet(answers, String(question.id || "") + ":" + label);
        results.push({ label: label, mode: choices ? "multiple_choice" : "whiteboard", acceptedAnswers: choices ? choices.acceptedAnswers : [], options: choices ? choices.options : [], correctOption: choices ? choices.correctOption : null });
      }
    });
    return results;
  }

  function defaultConfig(id) {
    var question = questionFor(id);
    var parts = automaticPartConfigs(question);
    var singleChoice = parts.length === 1 && parts[0].mode === "multiple_choice" ? parts[0] : null;
    return {
      type: parts.length > 1 ? "multipart" : singleChoice ? "multiple_choice" : "teacher_review",
      acceptedAnswers: singleChoice ? singleChoice.acceptedAnswers : [],
      numericAnswer: "",
      tolerance: "0.01",
      options: singleChoice ? singleChoice.options : [],
      correctOption: singleChoice ? singleChoice.correctOption : null,
      parts: parts,
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
    heading.textContent = "Student answer format";
    var methodCopy = document.createElement("small");
    methodCopy.className = "qb-answer-method-copy";
    var fields = document.createElement("div");
    fields.className = "qb-answer-fields";
    panel.appendChild(heading); panel.appendChild(methodCopy); panel.appendChild(fields);

    function renderFields() {
      fields.innerHTML = "";
      if (config.type === "multiple_choice") {
        methodCopy.textContent = "Students choose from one correct answer and four plausible alternatives. Choices are shuffled for each student.";
        var source = document.createElement("div"); source.className = "qb-answer-source"; source.textContent = "Correct answer checked against every accepted mark-scheme form"; fields.appendChild(source);
        fields.appendChild(choicePreview(config.options, config.correctOption));
        var choiceHint = document.createElement("small"); choiceHint.textContent = "Every answer option is checked automatically before you publish."; fields.appendChild(choiceHint);
      } else if (config.type === "multipart") {
        methodCopy.textContent = "Each part is answered separately. Suitable parts use five choices; written, proof and diagram parts use working on whiteboard or paper.";
        var partList = document.createElement("div"); partList.className = "qb-answer-part-list";
        config.parts.forEach(function (part) {
          var partRow = document.createElement("div"); partRow.className = "qb-answer-part-row";
          var partLabel = document.createElement("strong"); partLabel.textContent = part.label === "answer" ? "Answer" : "(" + part.label.replace("(", ")(") + ")";
          var partDetail = document.createElement("div");
          if (part.mode === "multiple_choice") {
            partDetail.appendChild(choicePreview(part.options, part.correctOption));
          } else {
            var whiteboard = document.createElement("span"); whiteboard.className = "qb-answer-review-note"; whiteboard.textContent = "Student confirms this part is completed on the whiteboard or paper."; partDetail.appendChild(whiteboard);
          }
          partRow.appendChild(partLabel); partRow.appendChild(partDetail); partList.appendChild(partRow);
        });
        fields.appendChild(partList);
        var multipartHint = document.createElement("small"); multipartHint.textContent = "Answers come from the matching mark-scheme part, and every option is checked automatically."; fields.appendChild(multipartHint);
      } else {
        methodCopy.textContent = "The student confirms that the proof, sketch, explanation or other written work is completed on the whiteboard or paper.";
        var note = document.createElement("div"); note.className = "qb-answer-review-note"; note.textContent = "No answer is guessed. The teacher can review saved whiteboard work or check the student’s paper."; fields.appendChild(note);
      }
    }

    function choicePreview(options, correctOption) {
      var list = document.createElement("div"); list.className = "qb-answer-choice-list";
      (Array.isArray(options) ? options : []).forEach(function (option, index) {
        var row = document.createElement("div"); row.className = "qb-answer-choice" + (index === correctOption ? " is-correct" : "");
        var text = document.createElement("span");
        if (choiceUtils && choiceUtils.renderAnswer) choiceUtils.renderAnswer(text, option);
        else text.textContent = option;
        row.appendChild(text);
        if (index === correctOption) { var badge = document.createElement("small"); badge.textContent = "Correct"; row.appendChild(badge); }
        list.appendChild(row);
      });
      return list;
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
