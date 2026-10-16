const library = window.MR_FLYNN_LIBRARY;

const courseDefinitions = [
  {
    id: "aa-sl",
    subject: "AA",
    level: "SL",
    code: "AA SL",
    name: "Analysis & Approaches SL",
    description: "The complete AA SL video course, organised across all five syllabus topics.",
    accent: "blue",
  },
  {
    id: "aa-hl",
    subject: "AA",
    level: "HL",
    code: "AA HL",
    name: "Analysis & Approaches HL",
    description: "The complete shared foundation plus every AA HL extension lesson.",
    accent: "navy",
  },
  {
    id: "ai-sl",
    subject: "AI",
    level: "SL",
    code: "AI SL",
    name: "Applications & Interpretation SL",
    description: "The complete AI SL video course, organised across all five syllabus topics.",
    accent: "teal",
  },
  {
    id: "ai-hl",
    subject: "AI",
    level: "HL",
    code: "AI HL",
    name: "Applications & Interpretation HL",
    description: "The complete shared foundation plus every AI HL extension lesson.",
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
  if (viewName === "progress") renderProgress();
}

function courseCard(course, large = false) {
  const completed = completedFor(course);
  const percentage = percentFor(course);
  const label = course.level === "HL" ? "Foundation + HL extension" : "Complete SL course";
  return `<article class="course-card ${large ? "is-large" : ""} accent-${course.accent}">
    <div class="course-card-art">
      <span class="course-card-code">${course.code}</span>
      <span class="course-card-symbol">${course.subject === "AA" ? "∫" : "σ"}</span>
      <span class="course-card-formula">${course.subject === "AA" ? "f′(x)" : "P(X ≤ x)"}</span>
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
  document.getElementById("continueCourseCode").textContent = course.code;
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
