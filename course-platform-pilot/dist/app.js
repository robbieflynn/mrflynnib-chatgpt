const library = window.MR_FLYNN_LIBRARY;
const pastPaperLibrary = window.MR_FLYNN_PAST_PAPERS;

const courseDefinitions = [
  {
    id: "aa-sl",
    subject: "AA",
    level: "SL",
    code: "AA SL",
    name: "Analysis & Approaches SL",
    description: "The complete AA SL video course, organised across all five syllabus topics.",
    image: "assets/course-aa-sl.png",
    accent: "blue",
  },
  {
    id: "aa-hl",
    subject: "AA",
    level: "HL",
    code: "AA HL",
    name: "Analysis & Approaches HL",
    description: "The complete shared foundation plus every AA HL extension lesson.",
    image: "assets/course-aa-hl.png",
    accent: "navy",
  },
  {
    id: "ai-sl",
    subject: "AI",
    level: "SL",
    code: "AI SL",
    name: "Applications & Interpretation SL",
    description: "The complete AI SL video course, organised across all five syllabus topics.",
    image: "assets/course-ai-sl.png",
    accent: "teal",
  },
  {
    id: "ai-hl",
    subject: "AI",
    level: "HL",
    code: "AI HL",
    name: "Applications & Interpretation HL",
    description: "The complete shared foundation plus every AI HL extension lesson.",
    image: "assets/course-ai-hl.png",
    accent: "indigo",
  },
];

const naturalSort = (a, b) => `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`, undefined, {
  numeric: true,
  sensitivity: "base",
});

function collectionLessons(name, topic, scope) {
  return (library.collections[name] || []).map((lesson) => ({ ...lesson, topic, scope }));
}

function buildCourse(definition) {
  const topics = [1, 2, 3, 4, 5].map((number) => {
    const mappedLessons = library.courses?.[definition.code];
    const lessons = mappedLessons
      ? mappedLessons.filter((lesson) => lesson.topic === number).map((lesson) => ({ ...lesson }))
      : collectionLessons(`${definition.subject} - Topic ${number} - SL + HL`, number, "SL + HL foundation");
    if (!mappedLessons && definition.level === "HL") lessons.push(...collectionLessons(`${definition.subject} HL - Topic ${number} - HL only`, number, "HL extension"));
    lessons.sort(naturalSort);
    return {
      number,
      name: library.topicNames[number],
      lessons,
      seconds: lessons.reduce((total, lesson) => total + lesson.seconds, 0),
    };
  });
  return {
    ...definition,
    topics,
    lessons: topics.flatMap((topic) => topic.lessons),
    seconds: topics.reduce((total, topic) => total + topic.seconds, 0),
  };
}

const courses = Object.fromEntries(courseDefinitions.map((definition) => {
  const course = buildCourse(definition);
  return [course.id, course];
}));

const storageKey = "mrflynnib-course-platform-v3";
let state = loadState();
let currentCourseId = courses[state.lastCourse] ? state.lastCourse : "aa-sl";
let currentCourse = courses[currentCourseId];
let currentLessonId = currentCourse.lessons.some((lesson) => lesson.id === state.lastLesson)
  ? state.lastLesson
  : currentCourse.lessons[0]?.id;
let currentTopic = currentCourse.lessons.find((lesson) => lesson.id === currentLessonId)?.topic || 1;
let currentPastPaperCourse = "AA HL";
let currentPastPaperSession = "all";
let currentPastPaperSetId = null;
let currentPastPaperQuestionId = null;
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.completed)) return saved;
  } catch {}
  return { completed: [], lastCourse: "aa-sl", lastLesson: null };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character]);
}

function formatDuration(seconds, compact = false) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (compact || minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatHours(seconds) {
  const hours = seconds / 3600;
  return hours >= 10 ? `${Math.round(hours)}` : hours.toFixed(1);
}

function completedFor(course) {
  return course.lessons.filter((lesson) => state.completed.includes(lesson.id)).length;
}

function percentFor(course) {
  return course.lessons.length ? Math.round((completedFor(course) / course.lessons.length) * 100) : 0;
}

function topicCompleted(topic) {
  return topic.lessons.filter((lesson) => state.completed.includes(lesson.id)).length;
}

function getCurrentLesson() {
  return currentCourse.lessons.find((lesson) => lesson.id === currentLessonId) || currentCourse.lessons[0];
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebarScrim").classList.remove("is-open");
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-visible", view.id === `${viewName}View`);
  });
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName || (viewName === "course" && button.dataset.view === "courses"));
  });
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "dashboard") renderDashboard();
  if (viewName === "courses") renderCourseCards();
  if (viewName === "pastPapers") renderPastPapers();
  if (viewName === "progress") renderProgress();
}

function courseCard(course, large = false) {
  const completed = completedFor(course);
  const percentage = percentFor(course);
  const label = course.level === "HL" ? "Foundation + HL extension" : "Complete SL course";
  return `<article class="course-card ${large ? "is-large" : ""} accent-${course.accent}">
    <div class="course-card-art">
      <img src="${course.image}" alt="${course.code} course cover — Mr Flynn IB" loading="lazy" />
    </div>
    <div class="course-card-body">
      <div class="course-card-meta"><span>${label}</span><span>${course.lessons.length} lessons</span></div>
      <h3>${course.name}</h3>
      <p>${course.description}</p>
      <div class="course-card-progress"><span style="width:${percentage}%"></span></div>
      <div class="course-card-footer"><small>${completed} completed · ${formatHours(course.seconds)} hours</small><button type="button" data-course-id="${course.id}">Open course →</button></div>
    </div>
  </article>`;
}

function renderCourseCards() {
  const markup = courseDefinitions.map((definition) => courseCard(courses[definition.id], true)).join("");
  document.getElementById("allCourseGrid").innerHTML = markup;
}

function renderDashboard() {
  const course = courses[state.lastCourse] || courses["aa-sl"];
  const lastLesson = course.lessons.find((lesson) => lesson.id === state.lastLesson);
  const nextLesson = lastLesson || course.lessons.find((lesson) => !state.completed.includes(lesson.id)) || course.lessons[0];
  const percentage = percentFor(course);
  const continueCourseImage = document.getElementById("continueCourseImage");
  continueCourseImage.src = course.image;
  continueCourseImage.alt = `${course.code} course cover — Mr Flynn IB`;
  document.getElementById("continueLessonTitle").textContent = `${nextLesson.code} ${nextLesson.title}`;
  document.getElementById("continueLessonMeta").textContent = `Topic ${nextLesson.topic}: ${library.topicNames[nextLesson.topic]} · ${formatDuration(nextLesson.seconds)}`;
  document.getElementById("continueProgressLabel").textContent = `${percentage}% complete`;
  document.getElementById("continueProgressCount").textContent = `${completedFor(course)} of ${course.lessons.length} lessons`;
  document.getElementById("continueProgressBar").style.width = `${percentage}%`;
  document.getElementById("continueButton").dataset.courseId = course.id;
  document.getElementById("continueButton").dataset.lessonId = nextLesson.id;
  document.getElementById("dashboardCourseGrid").innerHTML = courseDefinitions.map((definition) => courseCard(courses[definition.id])).join("");
}

function openCourse(courseId, lessonId = null) {
  if (!courses[courseId]) return;
  currentCourseId = courseId;
  currentCourse = courses[courseId];
  currentLessonId = lessonId && currentCourse.lessons.some((lesson) => lesson.id === lessonId)
    ? lessonId
    : currentCourse.lessons.find((lesson) => lesson.id === state.lastLesson)?.id || currentCourse.lessons[0]?.id;
  currentTopic = getCurrentLesson()?.topic || 1;
  state.lastCourse = courseId;
  state.lastLesson = currentLessonId;
  saveState();
  document.getElementById("lessonSearch").value = "";
  renderCourse();
  setView("course");
}

function renderTopicStrip() {
  document.getElementById("topicStrip").innerHTML = currentCourse.topics.map((topic) => {
    const completed = topicCompleted(topic);
    return `<button class="topic-button ${topic.number === currentTopic ? "is-active" : ""}" type="button" data-topic="${topic.number}">
      <span>Topic ${topic.number}</span>
      <strong>${escapeHtml(topic.name)}</strong>
      <small>${completed} / ${topic.lessons.length} complete</small>
    </button>`;
  }).join("");
}

function renderCourse() {
  const lesson = getCurrentLesson();
  if (!lesson) return;
  currentTopic = lesson.topic;
  const percentage = percentFor(currentCourse);
  document.getElementById("courseHero").className = `course-hero accent-${currentCourse.accent}`;
  document.getElementById("courseCode").textContent = currentCourse.code;
  document.getElementById("courseName").textContent = currentCourse.name;
  document.getElementById("courseSummary").textContent = currentCourse.description;
  document.getElementById("coursePercent").textContent = `${percentage}%`;
  document.getElementById("courseLessonCount").textContent = currentCourse.lessons.length;
  document.getElementById("courseHours").textContent = formatHours(currentCourse.seconds);
  document.getElementById("courseProgressBar").style.width = `${percentage}%`;
  renderTopicStrip();
  renderLesson(lesson);
  renderLessonList(document.getElementById("lessonSearch").value);
}

function renderLesson(lesson) {
  currentLessonId = lesson.id;
  currentTopic = lesson.topic;
  state.lastCourse = currentCourseId;
  state.lastLesson = lesson.id;
  saveState();
  const courseIndex = currentCourse.lessons.findIndex((candidate) => candidate.id === lesson.id);
  const complete = state.completed.includes(lesson.id);
  document.getElementById("lessonPosition").textContent = `Lesson ${courseIndex + 1} of ${currentCourse.lessons.length}`;
  document.getElementById("lessonTitle").textContent = `${lesson.code} ${lesson.title}`;
  document.getElementById("lessonMeta").textContent = `Topic ${lesson.topic} · ${library.topicNames[lesson.topic]}`;
  document.getElementById("metaCourse").textContent = currentCourse.code;
  document.getElementById("metaTopic").textContent = `${lesson.topic} · ${library.topicNames[lesson.topic]}`;
  document.getElementById("metaDuration").textContent = formatDuration(lesson.seconds);
  document.getElementById("metaAccess").textContent = lesson.scope;
  const completeButton = document.getElementById("completeButton");
  completeButton.classList.toggle("is-complete", complete);
  completeButton.lastElementChild.textContent = complete ? "Completed" : "Mark complete";
  document.getElementById("previousLesson").disabled = courseIndex <= 0;
  document.getElementById("nextLesson").disabled = courseIndex >= currentCourse.lessons.length - 1;
  const frame = document.getElementById("videoFrame");
  const nextSource = `https://iframe.mediadelivery.net/embed/${library.libraryId}/${lesson.id}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  if (frame.src !== nextSource) {
    document.getElementById("videoLoading").classList.remove("is-hidden");
    frame.src = nextSource;
    frame.onload = () => document.getElementById("videoLoading").classList.add("is-hidden");
  }
}

function renderLessonList(query = "") {
  const list = document.getElementById("lessonList");
  const normalized = query.trim().toLowerCase();
  let lessons = normalized
    ? currentCourse.lessons.filter((lesson) => `${lesson.code} ${lesson.title} ${library.topicNames[lesson.topic]} ${lesson.scope}`.toLowerCase().includes(normalized))
    : currentCourse.topics.find((topic) => topic.number === currentTopic)?.lessons || [];

  const headingTopic = normalized ? "All topics" : `Topic ${currentTopic}`;
  const headingTitle = normalized ? "Search results" : library.topicNames[currentTopic];
  document.getElementById("curriculumEyebrow").textContent = headingTopic;
  document.getElementById("curriculumTitle").textContent = headingTitle;
  document.getElementById("curriculumCount").textContent = `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}`;

  if (!lessons.length) {
    list.innerHTML = '<p class="no-results">No lessons match that search.</p>';
    return;
  }

  let previousGroup = "";
  list.innerHTML = lessons.map((lesson) => {
    const group = normalized ? `Topic ${lesson.topic} · ${lesson.scope}` : lesson.scope;
    const heading = group !== previousGroup ? `<div class="lesson-group-label">${escapeHtml(group)}</div>` : "";
    previousGroup = group;
    const complete = state.completed.includes(lesson.id);
    return `${heading}<button class="lesson-item ${lesson.id === currentLessonId ? "is-active" : ""} ${complete ? "is-complete" : ""}" type="button" data-lesson-id="${lesson.id}">
      <span class="lesson-state">${complete ? "✓" : "▶"}</span>
      <span><strong>${escapeHtml(`${lesson.code} ${lesson.title}`)}</strong><small>${formatDuration(lesson.seconds)}${lesson.status === 4 ? "" : " · Processing"}</small></span>
    </button>`;
  }).join("");
}

function moveLesson(direction) {
  const currentIndex = currentCourse.lessons.findIndex((lesson) => lesson.id === currentLessonId);
  const next = currentCourse.lessons[currentIndex + direction];
  if (!next) return;
  renderLesson(next);
  renderTopicStrip();
  renderLessonList();
  document.getElementById("videoShell").scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleComplete() {
  if (state.completed.includes(currentLessonId)) {
    state.completed = state.completed.filter((id) => id !== currentLessonId);
    showToast("Lesson marked as not complete");
  } else {
    state.completed.push(currentLessonId);
    showToast("Lesson completed");
  }
  saveState();
  renderCourse();
}

function renderProgress() {
  document.getElementById("progressCourseGrid").innerHTML = courseDefinitions.map((definition) => {
    const course = courses[definition.id];
    const complete = completedFor(course);
    const percentage = percentFor(course);
    const topicRows = course.topics.map((topic) => {
      const topicComplete = topicCompleted(topic);
      const topicPercent = topic.lessons.length ? Math.round((topicComplete / topic.lessons.length) * 100) : 0;
      return `<div class="topic-progress-row"><span>Topic ${topic.number}</span><div><i style="width:${topicPercent}%"></i></div><small>${topicComplete}/${topic.lessons.length}</small></div>`;
    }).join("");
    return `<article class="progress-course-card accent-${course.accent}">
      <div class="progress-course-head"><span>${course.code}</span><div><strong>${percentage}%</strong><small>complete</small></div></div>
      <h2>${course.name}</h2>
      <p>${complete} of ${course.lessons.length} lessons completed</p>
      <div class="topic-progress-list">${topicRows}</div>
      <button class="primary-button" type="button" data-course-id="${course.id}">Continue course</button>
    </article>`;
  }).join("");
}

function pastPaperSets() {
  const sets = pastPaperLibrary?.courses?.[currentPastPaperCourse] || [];
  return currentPastPaperSession === "all"
    ? sets
    : sets.filter((set) => set.session === currentPastPaperSession);
}

function renderPastPaperTabs() {
  document.getElementById("pastPaperCourseTabs").innerHTML = courseDefinitions.map((definition) => {
    const stats = pastPaperLibrary.stats[definition.code];
    return `<button class="past-paper-course-tab ${definition.code === currentPastPaperCourse ? "is-active" : ""}" type="button" data-past-course="${definition.code}">
      <span>${definition.code}</span>
      <strong>${escapeHtml(definition.name)}</strong>
      <small>${stats.papers} papers · ${stats.questions} solutions</small>
    </button>`;
  }).join("");
}

function renderPastPaperSessionFilter() {
  const select = document.getElementById("pastPaperSessionFilter");
  const sessions = [...new Set((pastPaperLibrary.courses[currentPastPaperCourse] || []).map((set) => set.session))];
  select.innerHTML = `<option value="all">All sessions</option>${sessions.map((session) => `<option value="${escapeHtml(session)}">${escapeHtml(session)}</option>`).join("")}`;
  if (!sessions.includes(currentPastPaperSession)) currentPastPaperSession = "all";
  select.value = currentPastPaperSession;
}

function renderPastPaperCatalog() {
  const sets = pastPaperSets();
  if (!sets.some((set) => set.id === currentPastPaperSetId)) currentPastPaperSetId = sets[0]?.id || null;
  document.getElementById("pastPaperCatalogTitle").textContent = `${currentPastPaperCourse} papers`;
  document.getElementById("pastPaperResultCount").textContent = `${sets.length} paper${sets.length === 1 ? "" : "s"}`;
  document.getElementById("pastPaperSetList").innerHTML = sets.length ? sets.map((set) => {
    const meta = [set.timezone, set.paper].filter(Boolean).join(" · ");
    return `<button class="paper-set-card ${set.id === currentPastPaperSetId ? "is-active" : ""}" type="button" data-paper-set-id="${set.id}">
      <span><small>${escapeHtml(set.session)}</small><strong>${escapeHtml(meta)}</strong><em>${set.questions.length} worked solution${set.questions.length === 1 ? "" : "s"}</em></span>
      <i aria-hidden="true">→</i>
    </button>`;
  }).join("") : '<p class="no-results">No papers match this session.</p>';
}

function currentPastPaperSet() {
  return (pastPaperLibrary.courses[currentPastPaperCourse] || []).find((set) => set.id === currentPastPaperSetId);
}

function renderPastPaperQuestions() {
  const set = currentPastPaperSet();
  if (!set) {
    document.getElementById("pastPaperQuestionList").innerHTML = "";
    document.getElementById("pastPaperSetTitle").textContent = "Questions";
    document.getElementById("pastPaperQuestionCount").textContent = "";
    return;
  }
  if (!set.questions.some((question) => question.id === currentPastPaperQuestionId)) currentPastPaperQuestionId = set.questions[0]?.id || null;
  document.getElementById("pastPaperSetTitle").textContent = [set.session, set.timezone, set.paper].filter(Boolean).join(" · ");
  document.getElementById("pastPaperQuestionCount").textContent = `${set.questions.length} solution${set.questions.length === 1 ? "" : "s"}`;
  document.getElementById("pastPaperQuestionList").innerHTML = set.questions.map((question, index) => `<button class="paper-question-button ${question.id === currentPastPaperQuestionId ? "is-active" : ""}" type="button" data-paper-question-id="${question.id}">
    <span>${index + 1}</span><strong>${escapeHtml(question.title)}</strong><small>${formatDuration(question.seconds)}</small>
  </button>`).join("");
  const question = set.questions.find((candidate) => candidate.id === currentPastPaperQuestionId) || set.questions[0];
  if (question) renderPastPaperQuestion(question);
}

function renderPastPaperQuestion(question) {
  const set = currentPastPaperSet();
  if (!set || !question) return;
  currentPastPaperQuestionId = question.id;
  const index = set.questions.findIndex((candidate) => candidate.id === question.id);
  document.getElementById("pastPaperQuestionPosition").textContent = `Solution ${index + 1} of ${set.questions.length}`;
  document.getElementById("pastPaperQuestionTitle").textContent = question.title;
  document.getElementById("pastPaperQuestionMeta").textContent = [set.session, set.timezone, set.paper, formatDuration(question.seconds)].filter(Boolean).join(" · ");
  document.getElementById("pastPaperBadge").textContent = currentPastPaperCourse;
  const frame = document.getElementById("pastPaperFrame");
  const nextSource = `https://iframe.mediadelivery.net/embed/${pastPaperLibrary.libraryId}/${question.id}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  if (frame.src !== nextSource) {
    document.getElementById("pastPaperLoading").classList.remove("is-hidden");
    frame.src = nextSource;
    frame.onload = () => document.getElementById("pastPaperLoading").classList.add("is-hidden");
  }
}

function renderPastPapers() {
  const stats = pastPaperLibrary.stats[currentPastPaperCourse];
  renderPastPaperTabs();
  renderPastPaperSessionFilter();
  document.getElementById("pastPaperCourseStats").innerHTML = `<strong>${currentPastPaperCourse}</strong><span>${stats.papers} papers with ${stats.questions} verified worked solutions</span>`;
  renderPastPaperCatalog();
  renderPastPaperQuestions();
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) setView(viewButton.dataset.view);

  const courseButton = event.target.closest("[data-course-id]");
  if (courseButton) openCourse(courseButton.dataset.courseId, courseButton.dataset.lessonId || null);

  const topicButton = event.target.closest("[data-topic]");
  if (topicButton) {
    currentTopic = Number(topicButton.dataset.topic);
    const topic = currentCourse.topics.find((item) => item.number === currentTopic);
    if (topic?.lessons.length) renderLesson(topic.lessons[0]);
    document.getElementById("lessonSearch").value = "";
    renderTopicStrip();
    renderLessonList();
  }

  const lessonButton = event.target.closest("[data-lesson-id]");
  if (lessonButton) {
    const lesson = currentCourse.lessons.find((candidate) => candidate.id === lessonButton.dataset.lessonId);
    if (lesson) {
      renderLesson(lesson);
      renderTopicStrip();
      renderLessonList(document.getElementById("lessonSearch").value);
      if (window.innerWidth < 920) document.getElementById("videoShell").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const pastCourseButton = event.target.closest("[data-past-course]");
  if (pastCourseButton) {
    currentPastPaperCourse = pastCourseButton.dataset.pastCourse;
    currentPastPaperSession = "all";
    currentPastPaperSetId = null;
    currentPastPaperQuestionId = null;
    renderPastPapers();
  }

  const paperSetButton = event.target.closest("[data-paper-set-id]");
  if (paperSetButton) {
    currentPastPaperSetId = paperSetButton.dataset.paperSetId;
    currentPastPaperQuestionId = null;
    renderPastPaperCatalog();
    renderPastPaperQuestions();
    if (window.innerWidth < 920) document.querySelector(".paper-solution-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const paperQuestionButton = event.target.closest("[data-paper-question-id]");
  if (paperQuestionButton) {
    const set = currentPastPaperSet();
    const question = set?.questions.find((candidate) => candidate.id === paperQuestionButton.dataset.paperQuestionId);
    if (question) {
      renderPastPaperQuestion(question);
      renderPastPaperQuestions();
      if (window.innerWidth < 920) document.querySelector(".paper-player-shell").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
});

document.getElementById("openMenu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("is-open");
  document.getElementById("sidebarScrim").classList.add("is-open");
});
document.getElementById("closeMenu").addEventListener("click", closeSidebar);
document.getElementById("sidebarScrim").addEventListener("click", closeSidebar);
document.getElementById("previousLesson").addEventListener("click", () => moveLesson(-1));
document.getElementById("nextLesson").addEventListener("click", () => moveLesson(1));
document.getElementById("completeButton").addEventListener("click", toggleComplete);
document.getElementById("lessonSearch").addEventListener("input", (event) => renderLessonList(event.target.value));
document.getElementById("pastPaperSessionFilter").addEventListener("change", (event) => {
  currentPastPaperSession = event.target.value;
  currentPastPaperSetId = null;
  currentPastPaperQuestionId = null;
  renderPastPaperCatalog();
  renderPastPaperQuestions();
});

const accountButton = document.getElementById("accountButton");
const accountMenu = document.getElementById("accountMenu");
accountButton.addEventListener("click", () => {
  accountMenu.hidden = !accountMenu.hidden;
  accountButton.setAttribute("aria-expanded", String(!accountMenu.hidden));
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("#accountButton") && !event.target.closest("#accountMenu")) {
    accountMenu.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
  }
});

const loginDialog = document.getElementById("loginDialog");
document.getElementById("showLogin").addEventListener("click", () => {
  accountMenu.hidden = true;
  loginDialog.showModal();
});
document.getElementById("closeLogin").addEventListener("click", () => loginDialog.close());
document.getElementById("prototypeLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  loginDialog.close();
  showToast("Prototype sign-in successful");
});

const helpDialog = document.getElementById("helpDialog");
document.getElementById("helpButton").addEventListener("click", () => helpDialog.showModal());
document.getElementById("closeHelp").addEventListener("click", () => helpDialog.close());

document.getElementById("resetProgress").addEventListener("click", () => {
  state.completed = [];
  state.lastCourse = "aa-sl";
  state.lastLesson = courses["aa-sl"].lessons[0]?.id || null;
  currentCourseId = "aa-sl";
  currentCourse = courses[currentCourseId];
  currentLessonId = state.lastLesson;
  currentTopic = 1;
  saveState();
  accountMenu.hidden = true;
  renderDashboard();
  renderCourseCards();
  renderProgress();
  if (document.getElementById("courseView").classList.contains("is-visible")) renderCourse();
  showToast("Prototype progress reset");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
});

document.getElementById("sidebarVideoCount").textContent = library.stats.videos;
document.getElementById("sidebarHours").textContent = Math.round(library.stats.seconds / 3600);
document.getElementById("summaryVideos").textContent = library.stats.videos;
document.getElementById("summaryHours").textContent = `${Math.round(library.stats.seconds / 3600)} hrs`;

renderDashboard();
renderCourseCards();
renderProgress();
