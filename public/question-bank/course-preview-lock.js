(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  if (params.get("plusPreview") !== "1" || window.parent === window) return;

  var selector = ".qb-ms-toggle,.qb-sol-toggle,.qb-progress-toggle,.qb-whiteboard-open-button";
  var style = document.createElement("style");
  style.textContent = [
    ".qb-plus-preview " + selector.split(",").join(",.qb-plus-preview ") + "{position:relative!important;padding-right:58px!important;}",
    ".qb-plus-preview " + selector.split(",").join("::after,.qb-plus-preview ") + "::after{content:'Plus';position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:3px 6px;border-radius:999px;background:#237fca;color:#fff;font-size:9px;font-weight:800;letter-spacing:.03em;}",
    ".qb-plus-preview .qb-progress-toggle:disabled{opacity:1!important;cursor:pointer!important;}",
  ].join("");
  document.head.appendChild(style);
  document.documentElement.classList.add("qb-plus-preview");

  function notifyParent() {
    window.parent.postMessage({ type: "mrflynnib-plus-required" }, window.location.origin);
  }

  function stopLockedAction(event) {
    var control = event.target && event.target.closest ? event.target.closest(selector) : null;
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    notifyParent();
  }

  document.addEventListener("pointerdown", stopLockedAction, true);
  document.addEventListener("click", stopLockedAction, true);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    stopLockedAction(event);
  }, true);
})();
