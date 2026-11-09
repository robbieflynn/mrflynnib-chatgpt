(function () {
  'use strict';
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({ type: 'mrflynnib-formula-booklet-close' }, window.location.origin);
    }
  });
  document.querySelector('nav').addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();
    document.querySelector(link.getAttribute('href')).scrollIntoView({ block: 'start' });
    document.querySelectorAll('nav a').forEach(function (item) { item.removeAttribute('aria-current'); });
    link.setAttribute('aria-current', 'location');
  });
})();
