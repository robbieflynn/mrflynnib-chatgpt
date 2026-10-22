(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("assignment") !== "1" || window.parent === window) return;

  var MAX_SELECTED = 100;
  var DRAFT_VERSION = 17;
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
    ".qb-assignment-bulk{margin:0 0 20px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid #b9d5ef;border-radius:12px;background:#f3f9ff;font:600 13px/1.35 var(--ui);color:#415b70}",
    ".qb-assignment-bulk[hidden]{display:none}",
    ".qb-assignment-bulk-copy{display:grid;gap:2px}",
    ".qb-assignment-bulk-copy strong{color:var(--flynn-blue-dark);font-size:14px}",
    ".qb-assignment-bulk button{flex:0 0 auto;min-height:42px;padding:10px 16px;border:0;border-radius:9px;background:var(--flynn-blue);color:#fff;font:800 13px/1.2 var(--ui);cursor:pointer}",
    ".qb-assignment-bulk button:hover{background:var(--flynn-blue-dark)}",
    ".qb-assignment-bulk button:disabled{background:#aab9c5;cursor:default}",
    ".qb-assignment-limit{position:fixed;left:50%;bottom:18px;z-index:100;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#9f2f2f;color:#fff;font:700 13px/1.2 var(--ui);box-shadow:0 8px 24px rgba(11,21,48,.22)}",
    "@media(max-width:600px){.qb-assignment-bulk{align-items:stretch;flex-direction:column}.qb-assignment-bulk button{width:100%}}",
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
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to assignment";
      card.classList.remove("qb-assignment-selected");
    });
    updateBulkControl();
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
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to assignment";
      card.classList.remove("qb-assignment-selected");
    }
    updateBulkControl();
    publish();
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data && event.data.type === "mrflynnib-assignment-clear") clearSelection();
    if (event.data && event.data.type === "mrflynnib-assignment-remove") removeSelection(String(event.data.id || ""));
    if (event.data && event.data.type === "mrflynnib-assignment-create-shadow") createShadowSelection(Array.isArray(event.data.sources) ? event.data.sources : []);
  });

  function questionFor(id) {
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    if (card && card.mrflynnibQuestion) return card.mrflynnibQuestion;
    var getQuestion = window.mrflynnibQuestionById;
    return typeof getQuestion === "function" ? getQuestion(id) : null;
  }

  function questionSummary(id) {
    var existing = summaries[id];
    var question = questionFor(id);
    if (!question) return existing || { id: id, title: "Selected question" };
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    var metaFor = window.mrflynnibQuestionMeta;
    var meta = typeof metaFor === "function" ? metaFor(id) : null;
    var text = function (selector) {
      var node = card && card.querySelector(selector);
      return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
    };
    return {
      id: id,
      title: plainText(question.title) || existing && existing.title || "Selected question",
      topic: meta && meta.topic || text(".qb-badge.topic .main") || existing && existing.topic || "",
      subtopic: meta && meta.subtopic || text(".qb-badge.topic .subs") || existing && existing.subtopic || "",
      paper: meta && meta.paper || text(".qb-badge.course") || existing && existing.paper || "",
      section: meta && meta.section === "B" || question.section === "B" ? "B" : "A",
      difficulty: meta && meta.difficulty || text(".qb-badge:not(.course):not(.topic):not(.marks)") || existing && existing.difficulty || "",
      marks: Number(question.marks) || existing && existing.marks || null
    };
  }

  var shadowRetryTimer = 0;
  function createShadowSelection(sources, attempt) {
    attempt = Number(attempt) || 0;
    window.clearTimeout(shadowRetryTimer);
    var findMatches = window.mrflynnibFindShadowQuestions;
    if (typeof findMatches !== "function") {
      if (attempt < 80) {
        shadowRetryTimer = window.setTimeout(function () { createShadowSelection(sources, attempt + 1); }, 250);
        return;
      }
      window.parent.postMessage({ type: "mrflynnib-assignment-shadow-result", complete: false, unmatched: [{ title: "The question bank could not finish loading." }] }, window.location.origin);
      return;
    }
    var result = findMatches(sources);
    if (!result || (result.unmatched && result.unmatched.length) || !result.ids || result.ids.length !== sources.length) {
      if (attempt < 80) {
        shadowRetryTimer = window.setTimeout(function () { createShadowSelection(sources, attempt + 1); }, 250);
        return;
      }
      window.parent.postMessage({ type: "mrflynnib-assignment-shadow-result", complete: false, unmatched: result && result.unmatched || [{ title: "No complete shadow match was found." }] }, window.location.origin);
      return;
    }
    selected = new Set(result.ids.map(String));
    configs = {};
    summaries = {};
    Array.from(selected).forEach(function (id) {
      configs[id] = defaultConfig(id);
      summaries[id] = questionSummary(id);
    });
    document.querySelectorAll(".qb-card").forEach(function (card) {
      var id = String(card.dataset.id || "");
      var isSelected = selected.has(id);
      var checkbox = card.querySelector(".qb-assignment-select input[type=checkbox]");
      var copy = card.querySelector(".qb-assignment-select span");
      if (checkbox) checkbox.checked = isSelected;
      if (copy) copy.textContent = isSelected ? "Selected for assignment" : "Add to assignment";
      card.classList.toggle("qb-assignment-selected", isSelected);
    });
    updateBulkControl();
    publish();
    window.parent.postMessage({ type: "mrflynnib-assignment-shadow-result", complete: true, matches: result.matches || [], fallbacks: Number(result.fallbacks) || 0 }, window.location.origin);
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
    return /\b(show that|prove|verify that|establish that|demonstrate that|sketch|draw|construct|plot|shade)\b/i.test(plainText(prompt))
      || /\b(?:show|establish|demonstrate)\b[\s\S]{0,100}\bthat\b/i.test(plainText(prompt))
      || /\b(?:apply|use|using)\b[\s\S]*\b(?:mathematical )?induction\b/i.test(plainText(prompt))
      || /\bcomplete\b[\s\S]*\b(?:diagram|table)\b/i.test(plainText(prompt));
  }

  function hasSharedWhiteboardInstruction(prompt) {
    var prefix = plainText(prompt).split(/\(i\)/i)[0];
    return requiresWhiteboard(prefix);
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
    var sequence = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    var pattern = /\(([ivxlcdm]+)\)/gi;
    var match;
    while ((match = pattern.exec(plainText(prompt)))) {
      var label = match[1].toLowerCase();
      if (label === sequence[labels.length]) labels.push(label);
    }
    return labels.indexOf("i") !== -1 && labels.indexOf("ii") !== -1 ? labels : [];
  }

  function rowsForSubpart(rows, label) {
    var start = -1;
    var end = rows.length;
    var firstLaterPart = -1;
    rows.forEach(function (row, index) {
      var match = plainText(Array.isArray(row) ? row[0] : "").match(/^\s*(?:METHOD\s*\d+\s*)?\(([ivxlcdm]+)\)/i);
      if (!match) return;
      if (firstLaterPart === -1 && match[1].toLowerCase() !== "i") firstLaterPart = index;
      if (match[1].toLowerCase() === label && start === -1) start = index;
      else if (start !== -1 && index > start && end === rows.length) end = index;
    });
    // Older mark schemes often label (ii) onwards but leave the opening (i)
    // rows unlabelled. Keep those rows with (i), rather than giving both
    // student sub-parts the entire mark scheme.
    if (start === -1 && label === "i" && firstLaterPart > 0) return rows.slice(0, firstLaterPart);
    return start === -1 ? [] : rows.slice(start, end);
  }

  function promptForSubpart(prompt, label) {
    var source = plainText(prompt);
    var marker = new RegExp("\\(" + label + "\\)", "i");
    var start = source.search(marker);
    if (start === -1) return source;
    var remainder = source.slice(start + label.length + 2);
    var labels = romanSubparts(prompt);
    var nextLabel = labels[labels.indexOf(label) + 1];
    var next = nextLabel ? remainder.search(new RegExp("\\(" + nextLabel + "\\)", "i")) : -1;
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
          var directlyLabelledRows = markschemeByPart[topLabel + "(" + nestedLabel + ")"] || [];
          var nestedRows = directlyLabelledRows.length ? directlyLabelledRows : rowsForSubpart(rows, nestedLabel);
          if (!nestedRows.length) nestedRows = rows;
          var answers = automaticAnswersFromRows(nestedRows, nestedPrompt);
          var label = topLabel ? topLabel + "(" + nestedLabel + ")" : nestedLabel;
          var whiteboardOnly = hasSharedWhiteboardInstruction(prompt) || requiresWhiteboard(nestedPrompt);
          var choices = whiteboardOnly ? null : choiceUtils && choiceUtils.generateComparisonReasonChoiceSet && choiceUtils.generateComparisonReasonChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateHypothesisChoiceSet && choiceUtils.generateHypothesisChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateExplanationChoiceSet && choiceUtils.generateExplanationChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateConceptChoiceSet && choiceUtils.generateConceptChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateParityChoiceSet && choiceUtils.generateParityChoiceSet(nestedRows, nestedPrompt, String(question.id || "") + ":" + label);
          if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateChoiceSet(answers, String(question.id || "") + ":" + label, nestedPrompt);
          if (choices && choiceUtils && choiceUtils.isAnswerCompatibleWithPrompt
            && !choiceUtils.isAnswerCompatibleWithPrompt(choices.options[choices.correctOption], nestedPrompt)) choices = null;
          results.push({ label: label, mode: choices ? "multiple_choice" : "whiteboard", acceptedAnswers: choices ? choices.acceptedAnswers : [], options: choices ? choices.options : [], correctOption: choices ? choices.correctOption : null });
        });
      } else {
        var answers = automaticAnswersFromRows(rows, prompt);
        var label = topLabel || "answer";
        var whiteboardOnly = requiresWhiteboard(prompt);
        var choices = whiteboardOnly ? null : choiceUtils && choiceUtils.generateComparisonReasonChoiceSet && choiceUtils.generateComparisonReasonChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateHypothesisChoiceSet && choiceUtils.generateHypothesisChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateExplanationChoiceSet && choiceUtils.generateExplanationChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateConceptChoiceSet && choiceUtils.generateConceptChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateParityChoiceSet && choiceUtils.generateParityChoiceSet(rows, prompt, String(question.id || "") + ":" + label);
        if (!whiteboardOnly && !choices) choices = choiceUtils && choiceUtils.generateChoiceSet(answers, String(question.id || "") + ":" + label, prompt);
        if (choices && choiceUtils && choiceUtils.isAnswerCompatibleWithPrompt
          && !choiceUtils.isAnswerCompatibleWithPrompt(choices.options[choices.correctOption], prompt)) choices = null;
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

  function showNotice(message) {
    var existing = document.querySelector(".qb-assignment-limit");
    if (existing) existing.remove();
    var notice = document.createElement("div");
    notice.className = "qb-assignment-limit";
    notice.setAttribute("role", "status");
    notice.textContent = message;
    document.body.appendChild(notice);
    window.setTimeout(function () { notice.remove(); }, 2600);
  }

  function showLimit() {
    showNotice("You can select up to 100 questions.");
  }

  function filteredQuestionIds() {
    var getIds = window.mrflynnibFilteredQuestionIds;
    return typeof getIds === "function" ? getIds().map(String).filter(Boolean) : [];
  }

  function syncRenderedCards() {
    document.querySelectorAll(".qb-card").forEach(function (card) {
      var id = String(card.dataset.id || "");
      var isSelected = selected.has(id);
      var checkbox = card.querySelector(".qb-assignment-select input[type=checkbox]");
      var copy = card.querySelector(".qb-assignment-select span");
      if (checkbox) checkbox.checked = isSelected;
      if (copy) copy.textContent = isSelected ? "Selected for assignment" : "Add to assignment";
      card.classList.toggle("qb-assignment-selected", isSelected);
    });
  }

  var bulkControl = null;
  var bulkButton = null;
  var bulkHeading = null;
  var bulkDetail = null;

  function updateBulkControl() {
    if (!bulkControl) return;
    var subtopicSelect = document.getElementById("qb-subtopic");
    var subtopic = subtopicSelect ? String(subtopicSelect.value || "") : "";
    var ids = subtopic ? filteredQuestionIds() : [];
    var unselectedCount = ids.filter(function (id) { return !selected.has(id); }).length;
    var remaining = Math.max(0, MAX_SELECTED - selected.size);
    bulkControl.hidden = !subtopic;
    if (!subtopic) return;
    bulkHeading.textContent = subtopic;
    if (!ids.length) {
      bulkDetail.textContent = "No questions match the other filters currently selected.";
      bulkButton.textContent = "No questions to add";
      bulkButton.disabled = true;
      return;
    }
    bulkDetail.textContent = ids.length + (ids.length === 1 ? " question matches" : " questions match") + " the filters above.";
    bulkButton.textContent = !remaining && unselectedCount ? "100-question limit reached" : unselectedCount ? "Select all " + ids.length : "All " + ids.length + " selected";
    bulkButton.disabled = unselectedCount === 0 || remaining === 0;
  }

  function installBulkControl() {
    var controls = document.getElementById("qb-controls");
    if (!controls || document.querySelector(".qb-assignment-bulk")) return;
    bulkControl = document.createElement("div");
    bulkControl.className = "qb-assignment-bulk";
    bulkControl.hidden = true;
    var copy = document.createElement("div");
    copy.className = "qb-assignment-bulk-copy";
    bulkHeading = document.createElement("strong");
    bulkDetail = document.createElement("span");
    copy.appendChild(bulkHeading);
    copy.appendChild(bulkDetail);
    bulkButton = document.createElement("button");
    bulkButton.type = "button";
    bulkButton.addEventListener("click", function () {
      var ids = filteredQuestionIds();
      var available = ids.filter(function (id) { return !selected.has(id); });
      var remaining = Math.max(0, MAX_SELECTED - selected.size);
      var additions = available.slice(0, remaining);
      additions.forEach(function (id) {
        selected.add(id);
        configs[id] = defaultConfig(id);
        summaries[id] = questionSummary(id);
      });
      syncRenderedCards();
      publish();
      updateBulkControl();
      if (available.length > additions.length) {
        showNotice("Added " + additions.length + " questions. Assignments can contain up to 100 questions.");
      }
    });
    bulkControl.appendChild(copy);
    bulkControl.appendChild(bulkButton);
    controls.insertAdjacentElement("afterend", bulkControl);
    ["qb-search", "qb-section", "qb-topic", "qb-subtopic", "qb-difficulty", "qb-papernum", "qb-only"].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      var refresh = function () { window.setTimeout(updateBulkControl, 0); };
      input.addEventListener("input", refresh);
      input.addEventListener("change", refresh);
    });
    updateBulkControl();
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
      publish();
      updateBulkControl();
    });
  }

  function decorateAll() {
    document.querySelectorAll(".qb-card").forEach(decorate);
    publish();
  }

  var list = document.getElementById("qb-list");
  if (list) new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
  installBulkControl();
  decorateAll();
  publish();
})();
