(function () {
  'use strict';

  var list = document.getElementById('qb-list');
  if (!list || window.parent === window) return;

  var account = { configured: false, signedIn: false };
  var completed = new Set();

  function post(message) {
    window.parent.postMessage(message, window.location.origin);
  }

  function labelFor(done) {
    if (!account.configured) return 'Saving coming soon';
    if (!account.signedIn) return 'Sign in to save';
    return done ? 'Completed' : 'Mark as completed';
  }

  function updateControl(card) {
    var button = card.querySelector('.qb-progress-toggle');
    if (!button) return;
    var questionId = card.getAttribute('data-id');
    var done = completed.has(questionId);
    button.classList.toggle('is-complete', done);
    button.setAttribute('aria-pressed', String(done));
    button.disabled = !account.configured || button.getAttribute('data-pending') === '1';
    button.querySelector('.qb-progress-label').textContent = labelFor(done);
    button.querySelector('.qb-progress-check').textContent = done ? '✓' : '';
  }

  function setupCard(card) {
    if (card.getAttribute('data-progress-ready')) return;
    var top = card.querySelector('.qb-card-top');
    if (!top) return;
    card.setAttribute('data-progress-ready', '1');
    var questionId = card.getAttribute('data-id');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'qb-progress-toggle';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span class="qb-progress-check" aria-hidden="true"></span><span class="qb-progress-label"></span>';
    button.addEventListener('click', function () {
      if (!account.configured) return;
      if (!account.signedIn) {
        post({ type: 'mrflynnib-account-required' });
        return;
      }
      var next = !completed.has(questionId);
      if (next) completed.add(questionId);
      else completed.delete(questionId);
      button.setAttribute('data-pending', '1');
      updateControl(card);
      post({ type: 'mrflynnib-progress-set', questionId: questionId, completed: next });
    });
    var heading = top.firstElementChild || top;
    heading.insertBefore(button, heading.firstChild);
    updateControl(card);
  }

  function scan() {
    Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), setupCard);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
    if (event.data.type === 'mrflynnib-account-state') {
      account.configured = Boolean(event.data.configured);
      account.signedIn = Boolean(event.data.signedIn);
      completed = new Set(Array.isArray(event.data.completedQuestionIds) ? event.data.completedQuestionIds.map(String) : []);
      window.__mrflynnibAccountState = account;
      scan();
      Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), updateControl);
    }
    if (event.data.type === 'mrflynnib-progress-result') {
      var card = list.querySelector('.qb-card[data-id="' + CSS.escape(String(event.data.questionId)) + '"]');
      if (!card) return;
      card.querySelector('.qb-progress-toggle').removeAttribute('data-pending');
      if (!event.data.ok) {
        if (event.data.completed) completed.delete(String(event.data.questionId));
        else completed.add(String(event.data.questionId));
      }
      updateControl(card);
    }
  });

  scan();
  window.setTimeout(scan, 0);
  window.setTimeout(scan, 250);
  window.setTimeout(scan, 1000);
  document.addEventListener('input', function () { window.setTimeout(scan, 0); });
  document.addEventListener('change', function () { window.setTimeout(scan, 0); });
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'mrflynnib-question-bank-load-more') window.setTimeout(scan, 0);
  });
  post({ type: 'mrflynnib-question-bank-ready' });
}());
