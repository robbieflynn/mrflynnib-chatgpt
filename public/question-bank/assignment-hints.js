(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var assignmentId = params.get("assignmentId");
  if (!assignmentId || params.get("assignmentWork") !== "1" || params.get("assignmentView") !== "step" || parent === window) return;
  var endpoint = "/api/assignments/" + encodeURIComponent(assignmentId) + "/hints";
  var records = new Map();
  var style = document.createElement("style");
  style.textContent = ".qb-hints{margin:16px 0;padding:16px;border:1px solid #c7d9e9;border-radius:12px;background:#f7faff;color:#203449;font:500 14px/1.55 var(--ui);min-width:0}.qb-hints[hidden]{display:none}.qb-hints h3{font-size:15px;margin:0 0 5px}.qb-hints p{margin:6px 0}.qb-hints button{margin-top:10px;padding:9px 15px;border:1px solid #8dafcd;border-radius:999px;background:white;color:#164972;font:700 13px var(--ui);cursor:pointer;min-height:40px}.qb-hints button:focus-visible{outline:3px solid #63a5db;outline-offset:3px}.qb-hints button:disabled{opacity:.6;cursor:wait}.qb-hint-step{border-top:1px solid #d9e5ef;padding:12px 0;margin-top:10px;overflow-wrap:anywhere}.qb-hint-step img,.qb-hint-step svg{max-width:100%;height:auto}.qb-hint-step .katex-display{overflow-x:auto;overflow-y:hidden}.qb-hint-label{font-size:12px;color:#496780;margin-bottom:5px}.qb-hint-error{color:#9b3030}.qb-hint-note{color:#526b7c;font-size:12px}";
  document.head.appendChild(style);
  function node(tag, copy, className) {
    var element = document.createElement(tag); if (copy) element.textContent = copy; if (className) element.className = className; return element;
  }
  function draw(record) {
    var panel = record.panel, data = record.data;
    panel.replaceChildren();
    panel.hidden = Boolean(data && !data.enabled && !data.steps.length && !record.error);
    if (panel.hidden) return;
    panel.appendChild(node("h3", "Hints"));
    if (!data) panel.appendChild(node("p", record.loading ? "Loading hints…" : "Hints could not be loaded."));
    if (data) {
      panel.appendChild(node("p", "Your teacher can see how many hints you use.", "qb-hint-note"));
      data.steps.forEach(function (step, index) {
        var item = node("section", "", "qb-hint-step");
        item.appendChild(node("div", "Hint " + (index + 1) + (step.part ? " · Part (" + step.part + ")" : "") + " · Step " + step.step, "qb-hint-label"));
        // These fragments come only from the repository's authored solution files.
        [step.title, step.text, step.work, step.figure].forEach(function (html, field) {
          if (!html) return; var content = node(field === 0 ? "strong" : "div"); content.innerHTML = html; item.appendChild(content);
        });
        panel.appendChild(item);
      });
      if (!data.canReveal) panel.appendChild(node("p", data.submitted ? "Previously revealed hints · Assignment submitted" : !data.enabled ? "Previously revealed hints · Further hints are switched off" : data.steps.length ? "All available hints are shown." : "No hints are available for this question.", "qb-hint-note"));
    }
    if (record.error) { var error = node("p", record.error, "qb-hint-error"); error.setAttribute("role", "alert"); panel.appendChild(error); }
    if (!data || data.canReveal || record.error) {
      var button = node("button", record.loading ? "Loading…" : record.error ? "Try again" : data && data.steps.length ? "Get another hint" : "Get a hint");
      button.type = "button"; button.disabled = record.loading;
      button.addEventListener("click", function () { load(record, Boolean(data && data.canReveal)); }); panel.appendChild(button);
    }
    if (window.renderMathInElement) window.renderMathInElement(panel, { throwOnError: false, trust: false });
  }
  async function load(record, reveal) {
    if (record.loading) return;
    record.loading = true; record.error = ""; draw(record);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(endpoint + (reveal ? "" : "?questionId=" + encodeURIComponent(record.id)), {
        method: reveal ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal,
        headers: reveal ? { "Content-Type": "application/json" } : {},
        body: reveal ? JSON.stringify({ questionId: record.id, expectedCount: record.data.steps.length }) : undefined
      });
      var data = await response.json();
      if (!response.ok) {
        // A changed teacher setting or submission needs a fresh read before retrying.
        if (response.status === 409 && record.data) record.data.canReveal = false;
        throw new Error(data.error || "Hints could not be loaded. Please try again.");
      }
      record.data = data;
    } catch (error) { record.error = error.name === "AbortError" ? "Hints are taking longer than expected. Please try again." : error.message; }
    finally { clearTimeout(timer); record.loading = false; draw(record); if (reveal) { var focusTarget = record.panel.querySelector("button") || record.panel; if (focusTarget === record.panel) focusTarget.setAttribute("tabindex", "-1"); focusTarget.focus({ preventScroll: true }); } }
  }
  function scan() {
    document.querySelectorAll("#qb-list>.qb-card.qb-assignment-current").forEach(function (card) {
      var id = card.dataset.id; if (!id) return;
      var record = records.get(id);
      if (!record) {
        record = { id: id, panel: node("aside", "", "qb-hints"), data: null, loading: false, error: "" };
        record.panel.setAttribute("aria-label", "Question hints"); records.set(id, record); load(record, false);
      }
      if (!card.contains(record.panel)) (card.querySelector(".qb-question-pane") || card).appendChild(record.panel);
    });
  }
  var scheduled = false;
  new MutationObserver(function (changes) {
    if (changes.every(function (change) { return change.target.closest && change.target.closest(".qb-hints"); })) return;
    if (scheduled) return; scheduled = true; requestAnimationFrame(function () { scheduled = false; scan(); });
  }).observe(document.getElementById("qb-list"), { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  scan();
})();
