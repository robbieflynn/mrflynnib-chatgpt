(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("test") !== "1" || window.parent === window) return;

  var MAX_SELECTED = 50;
  var draftId = String(params.get("draft") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  var draftKey = draftId ? "mrflynnib-test-draft:" + draftId : "";
  var selected = [];
  var details = {};

  if (draftKey) {
    try {
      var stored = JSON.parse(window.sessionStorage.getItem(draftKey) || "{}");
      if (Array.isArray(stored.ids)) selected = stored.ids.map(String).filter(Boolean).slice(0, MAX_SELECTED);
      if (stored.details && typeof stored.details === "object") details = stored.details;
    } catch { selected = []; details = {}; }
  }

  var style = document.createElement("style");
  style.textContent = [
    ".qb-header .qb-brand::after{content:' · Test maker';font-size:.72em;color:var(--ink-soft);font-weight:600}",
    ".qb-course-switch,.qb-progress-toggle,.qb-ms-toggle,.qb-sol-toggle,.qb-markscheme,.qb-solution{display:none!important}",
    ".qb-card{padding-top:0}",
    ".qb-test-select{margin:0 -18px 18px;padding:12px 18px;display:flex;align-items:center;gap:10px;background:#f3f9ff;border-bottom:1px solid #b9d5ef;border-radius:10px 10px 0 0;font:700 13px/1.2 var(--ui);color:var(--flynn-blue);cursor:pointer}",
    ".qb-test-select:hover{background:#e4f2ff}",
    ".qb-test-select input{width:19px;height:19px;margin:0;accent-color:var(--flynn-blue);cursor:pointer}",
    ".qb-card.qb-test-selected{outline:3px solid var(--flynn-blue);outline-offset:-2px}",
    ".qb-test-limit{position:fixed;left:50%;bottom:18px;z-index:100;transform:translateX(-50%);padding:10px 16px;border-radius:999px;background:#9f2f2f;color:#fff;font:700 13px/1.2 var(--ui);box-shadow:0 8px 24px rgba(11,21,48,.22)}",
    "@media(max-width:480px){.qb-test-select{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}}"
  ].join("");
  document.head.appendChild(style);

  function cleanText(value) {
    var node = document.createElement("div");
    node.innerHTML = String(value || "").replace(/<br\s*\/?>/gi, " ");
    return String(node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function printableHTML(card) {
    var body = card && card.querySelector(".qb-body");
    if (!body) return "";
    var clone = body.cloneNode(true);
    clone.querySelectorAll("button,.qb-ms-toggle,.qb-sol-toggle,.qb-markscheme,.qb-solution,.qb-whiteboard,.qb-whiteboard-resizer,.qb-diagram-copy-hint").forEach(function (node) { node.remove(); });
    clone.querySelectorAll(".qb-diagram").forEach(function (diagram) {
      diagram.classList.remove("qb-whiteboard-source");
      diagram.removeAttribute("data-whiteboard-source");
      diagram.querySelectorAll("svg").forEach(function (svg) {
        svg.removeAttribute("role");
        svg.removeAttribute("tabindex");
        svg.removeAttribute("aria-label");
        svg.removeAttribute("title");
      });
    });
    clone.querySelectorAll(".qb-question-pane").forEach(function (pane) {
      pane.replaceWith.apply(pane, Array.from(pane.childNodes));
    });
    clone.querySelectorAll(".qb-question-workspace").forEach(function (workspace) {
      workspace.replaceWith.apply(workspace, Array.from(workspace.childNodes));
    });
    clone.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
    return clone.innerHTML;
  }

  function printableMarkscheme(question) {
    var renderMarkscheme = window.mrflynnibMarkschemeHTML;
    if (!question || !Array.isArray(question.markscheme) || typeof renderMarkscheme !== "function") return "";
    var holder = document.createElement("div");
    holder.innerHTML = renderMarkscheme(question);
    holder.querySelectorAll("button,.qb-diagram-copy-hint").forEach(function (node) { node.remove(); });
    holder.querySelectorAll(".qb-diagram").forEach(function (diagram) {
      diagram.classList.remove("qb-whiteboard-source");
      diagram.removeAttribute("data-whiteboard-source");
      diagram.querySelectorAll("svg").forEach(function (svg) {
        svg.removeAttribute("role");
        svg.removeAttribute("tabindex");
        svg.removeAttribute("aria-label");
        svg.removeAttribute("title");
      });
    });
    holder.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
    return holder.innerHTML;
  }

  function summaryFor(card) {
    var question = card && card.mrflynnibQuestion;
    var id = card && card.dataset.id;
    if (!question || !id) return null;
    var metaFor = window.mrflynnibQuestionMeta;
    var meta = typeof metaFor === "function" ? metaFor(id) : null;
    var firstTopic = Array.isArray(question.topics) && question.topics[0] ? question.topics[0] : {};
    return {
      id: String(id),
      title: cleanText(question.title) || "Selected question",
      topic: cleanText(meta && meta.topic || firstTopic.main),
      subtopic: cleanText(meta && meta.subtopic || firstTopic.sub),
      paper: cleanText(meta && meta.paper || question.paperNumber),
      section: meta && meta.section === "B" || question.section === "B" ? "B" : "A",
      marks: Number(question.marks) || 0,
      html: printableHTML(card),
      markSchemeHtml: printableMarkscheme(question)
    };
  }

  function detachedCard(id) {
    var getQuestion = window.mrflynnibQuestionById;
    var renderCard = window.mrflynnibQuestionCardHTML;
    if (typeof getQuestion !== "function" || typeof renderCard !== "function") return null;
    var question = getQuestion(id);
    var html = renderCard(id);
    if (!question || !html) return null;
    var holder = document.createElement("div");
    holder.innerHTML = html;
    var card = holder.querySelector(".qb-card");
    if (!card) return null;
    card.mrflynnibQuestion = question;
    return card;
  }

  function createShadow(sources) {
    var findMatches = window.mrflynnibFindShadowQuestions;
    if (typeof findMatches !== "function") {
      window.parent.postMessage({ type: "mrflynnib-test-shadow", questions: [], unmatched: [{ title: "The question bank is still loading." }] }, window.location.origin);
      return;
    }
    var result = findMatches(sources);
    if (!result || (result.unmatched && result.unmatched.length)) {
      window.parent.postMessage({ type: "mrflynnib-test-shadow", questions: [], unmatched: result && result.unmatched || [{ title: "No complete shadow match was found." }] }, window.location.origin);
      return;
    }
    var questions = result.ids.map(function (id) {
      var visible = document.querySelector('.qb-card[data-id="' + CSS.escape(String(id)) + '"]');
      return summaryFor(visible || detachedCard(String(id)));
    }).filter(Boolean);
    if (questions.length !== result.ids.length) {
      window.parent.postMessage({ type: "mrflynnib-test-shadow", questions: [], unmatched: [{ title: "One matched question could not be prepared for printing." }] }, window.location.origin);
      return;
    }
    window.parent.postMessage({ type: "mrflynnib-test-shadow", questions: questions, unmatched: [] }, window.location.origin);
  }

  function refreshStoredMarkschemes() {
    var getQuestion = window.mrflynnibQuestionById;
    if (typeof getQuestion !== "function") return;
    selected.forEach(function (id) {
      var saved = details[id];
      if (!saved || saved.markSchemeHtml) return;
      var markSchemeHtml = printableMarkscheme(getQuestion(id));
      if (markSchemeHtml) saved.markSchemeHtml = markSchemeHtml;
    });
  }

  function publish() {
    // Older saved drafts did not contain mark-scheme HTML. Enrich every
    // selected question from the loaded bank, including questions that are not
    // on the currently visible filtered page.
    refreshStoredMarkschemes();
    var published = selected.map(function (id) { return details[id]; }).filter(Boolean);
    if (draftKey) {
      var savedDetails = {};
      published.forEach(function (item) { savedDetails[item.id] = item; });
      try { window.sessionStorage.setItem(draftKey, JSON.stringify({ ids: selected, details: savedDetails })); } catch { /* The live selection still works if storage is full. */ }
    }
    window.parent.postMessage({ type: "mrflynnib-test-selection", questions: published }, window.location.origin);
  }

  function clearSelection() {
    selected = [];
    details = {};
    if (draftKey) {
      try { window.sessionStorage.removeItem(draftKey); } catch { /* Session storage is optional. */ }
    }
    document.querySelectorAll(".qb-card").forEach(function (card) {
      var checkbox = card.querySelector(".qb-test-select input[type=checkbox]");
      var copy = card.querySelector(".qb-test-select span");
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to test";
      card.classList.remove("qb-test-selected");
    });
    publish();
  }

  function removeSelection(id) {
    selected = selected.filter(function (item) { return item !== id; });
    delete details[id];
    var card = document.querySelector('.qb-card[data-id="' + CSS.escape(id) + '"]');
    if (card) {
      var checkbox = card.querySelector(".qb-test-select input[type=checkbox]");
      var copy = card.querySelector(".qb-test-select span");
      if (checkbox) checkbox.checked = false;
      if (copy) copy.textContent = "Add to test";
      card.classList.remove("qb-test-selected");
    }
    publish();
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data && event.data.type === "mrflynnib-test-clear") clearSelection();
    if (event.data && event.data.type === "mrflynnib-test-remove") removeSelection(String(event.data.id || ""));
    if (event.data && event.data.type === "mrflynnib-test-create-shadow") createShadow(Array.isArray(event.data.sources) ? event.data.sources : []);
    if (event.data && event.data.type === "mrflynnib-test-reorder" && Array.isArray(event.data.ids)) {
      var next = event.data.ids.map(String).filter(function (id) { return selected.indexOf(id) !== -1; });
      if (next.length === selected.length) { selected = next; publish(); }
    }
  });

  function showLimit() {
    var existing = document.querySelector(".qb-test-limit");
    if (existing) existing.remove();
    var notice = document.createElement("div");
    notice.className = "qb-test-limit";
    notice.setAttribute("role", "status");
    notice.textContent = "You can select up to 50 questions for one test.";
    document.body.appendChild(notice);
    window.setTimeout(function () { notice.remove(); }, 2600);
  }

  function decorate(card) {
    if (!(card instanceof HTMLElement) || card.dataset.testReady === "1") return;
    var id = card.dataset.id;
    if (!id) return;
    card.dataset.testReady = "1";
    var label = document.createElement("label");
    label.className = "qb-test-select";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.indexOf(id) !== -1;
    checkbox.setAttribute("aria-label", "Add this question to the test");
    var copy = document.createElement("span");
    copy.textContent = checkbox.checked ? "Selected for test" : "Add to test";
    label.appendChild(checkbox);
    label.appendChild(copy);
    card.insertBefore(label, card.firstChild);
    card.classList.toggle("qb-test-selected", checkbox.checked);

    var summary = summaryFor(card);
    if (checkbox.checked && summary) details[id] = summary;

    checkbox.addEventListener("change", function () {
      if (checkbox.checked && selected.length >= MAX_SELECTED && selected.indexOf(id) === -1) {
        checkbox.checked = false;
        showLimit();
        return;
      }
      if (checkbox.checked) {
        if (selected.indexOf(id) === -1) selected.push(id);
        var nextSummary = summaryFor(card);
        if (nextSummary) details[id] = nextSummary;
      } else {
        selected = selected.filter(function (item) { return item !== id; });
        delete details[id];
      }
      copy.textContent = checkbox.checked ? "Selected for test" : "Add to test";
      card.classList.toggle("qb-test-selected", checkbox.checked);
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
