(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  if (window.parent === window || params.get('practice') !== '1' || params.get('embedded') !== '1') return;
  document.documentElement.classList.add('qb-course-practice');

  var expanded = false;
  function reportHeight() {
    var root = document.getElementById('qbank-root');
    if (!root || expanded) return;
    window.parent.postMessage({
      type: 'mrflynnib-question-bank-height',
      height: Math.ceil(Math.max(root.getBoundingClientRect().bottom + window.scrollY, root.offsetTop + root.scrollHeight) + 32)
    }, window.location.origin);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'mrflynnib-question-bank-scroll') {
      expanded = event.data.enabled === true;
      // A bounded expanded frame owns its scrollbar. Inline practice grows
      // with its content so the course page remains the only scrollbar.
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.overflowY = expanded ? 'auto' : 'hidden';
      document.body.style.overflow = expanded ? 'visible' : 'hidden';
      if (!expanded) window.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(reportHeight);
    }
    if (event.data?.type === 'mrflynnib-practice-collapse-whiteboard') {
      document.querySelector('.qb-whiteboard-expanded [data-whiteboard-action="expand"]')?.click();
      requestAnimationFrame(reportHeight);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !expanded || event.defaultPrevented) return;
    // Let the whiteboard or formula viewer close its own foremost control.
    if (document.querySelector('.qb-whiteboard-expanded, [role="dialog"]:not([hidden]), dialog[open]')) return;
    window.parent.postMessage({ type: 'mrflynnib-practice-close' }, window.location.origin);
  });
})();
