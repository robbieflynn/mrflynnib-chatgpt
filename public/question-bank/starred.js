(function () {
  'use strict';

  var list = document.getElementById('qb-list');
  var controls = document.getElementById('qb-controls');
  if (!list || !controls || window.parent === window) return;

  var params = new URLSearchParams(window.location.search);
  var teacherQuestionSelector = params.get('assignment') === '1' || params.get('test') === '1';
  if (teacherQuestionSelector) return;
  var fixedQuestionSet = Boolean(params.get('ids')) || params.get('assignmentWork') === '1';

  var account = { configured: false, signedIn: false };
  var starred = new Set();
  var pending = Object.create(null);
  var starredOnly = false;
  var filterButton = null;

  window.__mrflynnibStarredQuestionIds = starred;
  window.__mrflynnibStarredOnly = starredOnly;

  function post(message) {
    window.parent.postMessage(message, window.location.origin);
  }

  function labelFor(questionId, isStarred) {
    return (isStarred ? 'Remove question from' : 'Save question to') + ' starred questions';
  }

  function updateFilterButton() {
    if (!filterButton) return;
    filterButton.setAttribute('aria-pressed', String(starredOnly));
    filterButton.title = account.signedIn
      ? (starredOnly ? 'Show all questions' : 'Show only your starred questions')
      : 'Sign in to save and view starred questions';
  }

  function updateCard(card) {
    var button = card.querySelector('.qb-star-toggle');
    if (!button) return;
    var questionId = String(card.getAttribute('data-id') || '');
    var isStarred = starred.has(questionId);
    button.setAttribute('aria-pressed', String(isStarred));
    button.setAttribute('aria-label', labelFor(questionId, isStarred));
    button.title = account.signedIn ? labelFor(questionId, isStarred) : 'Sign in to save this question';
    button.disabled = pending[questionId] === true;
    button.setAttribute('data-pending', pending[questionId] ? '1' : '0');
    button.querySelector('.qb-star-icon').textContent = isStarred ? '\u2605' : '\u2606';
  }

  function setupCard(card) {
    if (card.getAttribute('data-star-ready') === '1') return;
    var badges = card.querySelector('.qb-badges');
    if (!badges) return;
    card.setAttribute('data-star-ready', '1');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'qb-star-toggle';
    button.innerHTML = '<span class="qb-star-icon" aria-hidden="true">\u2606</span>';
    badges.insertBefore(button, badges.firstChild);
    updateCard(card);
  }

  function scan() {
    Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), setupCard);
    Array.prototype.forEach.call(list.querySelectorAll('.qb-card'), updateCard);
  }

  function refreshQuestions() {
    window.__mrflynnibStarredQuestionIds = starred;
    window.__mrflynnibStarredOnly = starredOnly;
    if (typeof window.mrflynnibRefreshQuestionFilters === 'function') {
      window.mrflynnibRefreshQuestionFilters();
    }
    window.setTimeout(scan, 0);
  }

  if (!fixedQuestionSet) {
    filterButton = document.createElement('button');
    filterButton.type = 'button';
    filterButton.id = 'qb-starred-filter';
    filterButton.className = 'qb-star-filter';
    filterButton.innerHTML = '<span class="qb-star-filter-icon" aria-hidden="true">\u2605</span><span>Starred</span>';
    var count = controls.querySelector('.qb-count');
    controls.insertBefore(filterButton, count || null);
    updateFilterButton();

    filterButton.addEventListener('click', function () {
      if (!account.configured) return;
      if (!account.signedIn) {
        post({ type: 'mrflynnib-account-required' });
        return;
      }
      starredOnly = !starredOnly;
      updateFilterButton();
      refreshQuestions();
    });
  }

  list.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('.qb-star-toggle');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (!account.configured) return;
    if (!account.signedIn) {
      post({ type: 'mrflynnib-account-required' });
      return;
    }
    var card = button.closest('.qb-card');
    var questionId = String(card && card.getAttribute('data-id') || '');
    if (!questionId || pending[questionId]) return;
    var next = !starred.has(questionId);
    if (next) starred.add(questionId);
    else starred.delete(questionId);
    pending[questionId] = true;
    button.removeAttribute('data-save-failed');
    updateCard(card);
    post({ type: 'mrflynnib-star-set', questionId: questionId, starred: next });
  });

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
    if (event.data.type === 'mrflynnib-account-state') {
      account.configured = Boolean(event.data.configured);
      account.signedIn = Boolean(event.data.signedIn);
      starred = new Set(Array.isArray(event.data.starredQuestionIds) ? event.data.starredQuestionIds.map(String) : []);
      if (!account.signedIn) starredOnly = false;
      updateFilterButton();
      refreshQuestions();
      return;
    }
    if (event.data.type === 'mrflynnib-star-result') {
      var questionId = String(event.data.questionId || '');
      pending[questionId] = false;
      if (!event.data.ok) {
        if (event.data.starred) starred.delete(questionId);
        else starred.add(questionId);
      }
      var card = list.querySelector('.qb-card[data-id="' + CSS.escape(questionId) + '"]');
      if (card) {
        updateCard(card);
        if (!event.data.ok) {
          var button = card.querySelector('.qb-star-toggle');
          button.setAttribute('data-save-failed', '1');
          button.title = 'Could not save. Please try again.';
          window.setTimeout(function () {
            button.removeAttribute('data-save-failed');
            updateCard(card);
          }, 2400);
        }
      }
      if (starredOnly) refreshQuestions();
    }
  });

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (mutations) {
      if (mutations.some(function (mutation) { return mutation.addedNodes.length > 0; })) {
        window.setTimeout(scan, 0);
      }
    }).observe(list, { childList: true, subtree: true });
  }

  scan();
  post({ type: 'mrflynnib-question-bank-ready' });
}());
