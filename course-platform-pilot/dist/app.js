const library = window.MR_FLYNN_LIBRARY;
const igcseLibrary = window.MR_FLYNN_IGCSE_LIBRARY;
const pastPaperLibrary = window.MR_FLYNN_PAST_PAPERS;
const practiceLibrary = window.MR_FLYNN_PRACTICE;
const previewParameters = new URLSearchParams(window.location.search);
const previewMode = previewParameters.get("v");
const reviewerMode = previewMode === "all-courses-review";
const salesPreviewMode = previewMode?.startsWith("course-preview-") || false;
const previewCourseId = salesPreviewMode
  ? previewMode.replace("course-preview-", "")
  : previewMode?.startsWith("single-course-")
    ? previewMode.replace("single-course-", "")
    : null;
const previewTopic = Number(previewParameters.get("topic"));

const courseDefinitions = [
  {
    id: "aa-hl",
    subject: "AA",
    level: "HL",
    code: "AA HL",
    name: "Analysis & Approaches HL",
    description: "The complete AA HL course, organised across all five syllabus topics.",
    image: "assets/course-aa-hl.png",
    accent: "navy",
  },
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
    id: "ai-hl",
    subject: "AI",
    level: "HL",
    code: "AI HL",
    name: "Applications & Interpretation HL",
    description: "The complete AI HL course, organised across all five syllabus topics.",
    image: "assets/course-ai-hl.png",
    accent: "indigo",
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
    id: "igcse",
    subject: "IGCSE",
    level: "",
    code: "IGCSE",
    name: "Edexcel IGCSE Mathematics",
    description: "Lessons for every topic, organised across all six areas of the Edexcel IGCSE Mathematics course.",
    image: null,
    accent: "red",
    topicCount: 6,
    family: "Edexcel IGCSE Mathematics",
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
  const topicNumbers = Array.from({ length: definition.topicCount || 5 }, (_, index) => index + 1);
  const topics = topicNumbers.map((number) => {
    if (definition.id === "igcse") {
      const lessons = igcseLibrary.lessons.filter((lesson) => lesson.topic === number).map((lesson) => ({ ...lesson }));
      lessons.sort(naturalSort);
      return {
        number,
        name: igcseLibrary.topicNames[number],
        lessons,
        seconds: lessons.reduce((total, lesson) => total + lesson.seconds, 0),
      };
    }
    const mappedLessons = library.courses?.[definition.code];
    const lessons = mappedLessons
      ? mappedLessons.filter((lesson) => lesson.topic === number).map((lesson) => ({ ...lesson }))
      : collectionLessons(`${definition.subject} - Topic ${number} - SL + HL`, number, "Course lesson");
    if (!mappedLessons && definition.level === "HL") lessons.push(...collectionLessons(`${definition.subject} HL - Topic ${number} - HL only`, number, "Course lesson"));
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

// The student portal only shows courses the signed-in account owns. The
// prototype learner is enrolled in AA HL so the preview demonstrates the
// intended single-course experience without exposing the full catalogue.
const validPreviewCourseId = courseDefinitions.some((definition) => definition.id === previewCourseId)
  ? previewCourseId
  : null;
const enrolledCourseIds = reviewerMode
  ? courseDefinitions.map((definition) => definition.id)
  : [validPreviewCourseId || "aa-hl"];
const enrolledCourseDefinitions = courseDefinitions.filter((definition) => enrolledCourseIds.includes(definition.id));
const enrolledCourseId = validPreviewCourseId || "aa-hl";

const storageKey = "mrflynnib-course-platform-v3";
const practiceDatabaseName = "mrflynnib-course-preview";
const practiceDatabaseVersion = 1;
const practiceWhiteboardStore = "whiteboards";
let state = loadState();
let currentCourseId = enrolledCourseIds.includes(state.lastCourse) ? state.lastCourse : enrolledCourseId;
let currentCourse = courses[currentCourseId];
let currentLessonId = currentCourse.lessons.some((lesson) => lesson.id === state.lastLesson)
  ? state.lastLesson
  : currentCourse.lessons[0]?.id;
let currentTopic = currentCourse.lessons.find((lesson) => lesson.id === currentLessonId)?.topic || 1;
let currentPastPaperCourse = pastPaperLibrary.courses?.[currentCourse.code] ? currentCourse.code : "AA HL";
let currentPastPaperSession = "all";
let currentPastPaperSetId = null;
let currentPastPaperQuestionId = null;
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.completed)) {
      if (!Array.isArray(saved.practiceCompleted)) saved.practiceCompleted = [];
      return saved;
    }
  } catch {}
  return { completed: [], practiceCompleted: [], lastCourse: enrolledCourseId, lastLesson: null };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

let practiceDatabasePromise;

function openPracticeDatabase() {
  if (!practiceDatabasePromise) {
    practiceDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(practiceDatabaseName, practiceDatabaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(practiceWhiteboardStore)) {
          database.createObjectStore(practiceWhiteboardStore);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open whiteboard storage"));
    });
  }
  return practiceDatabasePromise;
}

function practiceCurriculumKey() {
  return currentCourseId === "igcse" ? "igcse" : "ib";
}

function practiceQuestionKey(questionId) {
  return `${practiceCurriculumKey()}:${questionId}`;
}

async function getSavedWhiteboard(questionId) {
  const database = await openPracticeDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(practiceWhiteboardStore, "readonly")
      .objectStore(practiceWhiteboardStore)
      .get(practiceQuestionKey(questionId));
    request.onsuccess = () => resolve(request.result?.document || null);
    request.onerror = () => reject(request.error || new Error("Could not load whiteboard"));
  });
}

async function saveWhiteboard(questionId, document) {
  const database = await openPracticeDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(practiceWhiteboardStore, "readwrite");
    transaction.objectStore(practiceWhiteboardStore).put({
      document,
      updatedAt: new Date().toISOString(),
    }, practiceQuestionKey(questionId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save whiteboard"));
    transaction.onabort = () => reject(transaction.error || new Error("Whiteboard save was interrupted"));
  });
}

function completedPracticeQuestionIds() {
  const prefix = `${practiceCurriculumKey()}:`;
  return state.practiceCompleted
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

function sendPracticeAccountState(target) {
  target.postMessage({
    type: "mrflynnib-account-state",
    configured: true,
    signedIn: true,
    readOnly: false,
    localOnly: true,
    completedQuestionIds: completedPracticeQuestionIds(),
  }, window.location.origin);
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

function completedFor(course) {
  return course.lessons.filter((lesson) => state.completed.includes(lesson.id)).length;
}

function percentFor(course) {
  return course.lessons.length ? Math.round((completedFor(course) / course.lessons.length) * 100) : 0;
}

function topicCompleted(topic) {
  return topic.lessons.filter((lesson) => state.completed.includes(lesson.id)).length;
}

function topicName(course, topicNumber) {
  return course.topics.find((topic) => topic.number === topicNumber)?.name || `Topic ${topicNumber}`;
}

function courseArtwork(course) {
  if (course.image) {
    return `<img src="${course.image}" alt="${escapeHtml(course.code)} course cover, Mr Flynn IB" loading="lazy" />`;
  }
  return `<div class="igcse-course-art" aria-label="Edexcel IGCSE Mathematics course cover">
    <span>IGCSE</span><strong>Mathematics</strong><small>Mr Flynn IB</small>
  </div>`;
}

function configurePreviewMode() {
  if (!reviewerMode && !validPreviewCourseId) return;
  if (validPreviewCourseId) {
    const course = courses[validPreviewCourseId];
    document.title = `${course.code} course preview | Mr Flynn IB`;
    document.querySelector(".prototype-strip strong").textContent = salesPreviewMode ? `${course.code} free course preview` : `Private ${course.code} course preview`;
    document.querySelector(".prototype-strip span").textContent = salesPreviewMode
      ? "Try three complete lesson-and-practice samples. Locked lessons are included with full course access."
      : "Review the real lesson, practice and curriculum experience before the public launch.";
    return;
  }
  document.body.classList.add("reviewer-mode");
  document.title = "All five courses review | Mr Flynn IB";
  document.querySelector(".prototype-strip strong").textContent = "Private five-course review";
  document.querySelector(".prototype-strip span").textContent = "Review-only view. Nothing here is live and no payments or student accounts are connected.";
  document.getElementById("coursesNavLabel").textContent = "All courses";
  document.getElementById("sidebarCourseLabel").textContent = "Four IB courses and Edexcel IGCSE";
  document.getElementById("welcomeEyebrow").textContent = "Private review";
  document.getElementById("welcomeTitle").textContent = "Review all five courses";
  document.getElementById("welcomeCopy").textContent = "Open every course, topic and lesson from one private inspection view.";
  document.getElementById("libraryStatusText").textContent = "Five complete course pathways";
  document.getElementById("enrolmentEyebrow").textContent = "Review catalogue";
  document.getElementById("dashboardCoursesTitle").textContent = "All five courses";
  document.getElementById("dashboardCoursesButton").textContent = "Inspect all courses →";
  document.getElementById("coursesEyebrow").textContent = "Private course review";
  document.getElementById("coursesTitle").textContent = "All five courses";
  document.getElementById("coursesDescription").textContent = "Inspect the complete lesson structure for AA HL, AA SL, AI HL, AI SL and Edexcel IGCSE Mathematics. Open any card to review its topics, videos and mapped practice.";
  document.getElementById("courseBackButton").textContent = "← All courses";
  document.getElementById("summaryTopics").textContent = "26";
  document.getElementById("summaryTopicsLabel").textContent = "course topics";
}

function getCurrentLesson() {
  return currentCourse.lessons.find((lesson) => lesson.id === currentLessonId) || currentCourse.lessons[0];
}

function salesPreviewLessons(course = currentCourse) {
  return course.topics.slice(0, 3).map((topic) => topic.lessons[0]).filter(Boolean);
}

function lessonIsAvailable(lesson) {
  return !salesPreviewMode || salesPreviewLessons().some((sample) => sample.id === lesson.id);
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
  return `<button type="button" class="course-card ${large ? "is-large" : ""} accent-${course.accent}" data-course-id="${course.id}" aria-label="Open ${escapeHtml(course.code)} course">
    <div class="course-card-art">
      ${courseArtwork(course)}
    </div>
    <div class="course-card-body">
      <div class="course-card-meta"><span>Complete ${course.code} course</span><span>${course.lessons.length} lessons</span></div>
      <h3>${course.name}</h3>
      <p>${course.description}</p>
      <div class="course-card-progress"><span style="width:${percentage}%"></span></div>
      <div class="course-card-footer"><small>${completed} of ${course.lessons.length} completed</small><span class="course-card-link">Open course →</span></div>
    </div>
  </button>`;
}

function renderCourseCards() {
  const markup = enrolledCourseDefinitions.map((definition) => courseCard(courses[definition.id], true)).join("");
  document.getElementById("allCourseGrid").innerHTML = markup;
}

function renderDashboard() {
  const course = courses[enrolledCourseId];
  const lastLesson = course.lessons.find((lesson) => lesson.id === state.lastLesson);
  const nextLesson = lastLesson || course.lessons.find((lesson) => !state.completed.includes(lesson.id)) || course.lessons[0];
  const percentage = percentFor(course);
  const continueCourseImage = document.getElementById("continueCourseImage");
  continueCourseImage.src = course.image;
  continueCourseImage.alt = `${course.code} course cover, Mr Flynn IB`;
  document.getElementById("continueLessonTitle").textContent = `${nextLesson.code} ${nextLesson.title}`;
  document.getElementById("continueLessonMeta").textContent = `Topic ${nextLesson.topic}: ${topicName(course, nextLesson.topic)} · ${formatDuration(nextLesson.seconds)}`;
  document.getElementById("continueProgressLabel").textContent = `${percentage}% complete`;
  document.getElementById("continueProgressCount").textContent = `${completedFor(course)} of ${course.lessons.length} lessons`;
  document.getElementById("continueProgressBar").style.width = `${percentage}%`;
  document.getElementById("continueButton").dataset.courseId = course.id;
  document.getElementById("continueButton").dataset.lessonId = nextLesson.id;
  document.getElementById("dashboardCourseGrid").innerHTML = enrolledCourseDefinitions.map((definition) => courseCard(courses[definition.id])).join("");
}

function openCourse(courseId, lessonId = null) {
  if (!courses[courseId] || !enrolledCourseIds.includes(courseId)) return;
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
  document.getElementById("courseFamily").textContent = currentCourse.family || "IB Mathematics";
  document.getElementById("coursePercent").textContent = `${percentage}%`;
  document.getElementById("courseLessonCount").textContent = currentCourse.lessons.length;
  document.getElementById("courseTopicCount").textContent = currentCourse.topics.length;
  document.getElementById("topicStrip").style.setProperty("--topic-count", currentCourse.topics.length);
  document.getElementById("courseProgressBar").style.width = `${percentage}%`;
  renderTopicStrip();
  renderLesson(lesson);
  renderLessonList(document.getElementById("lessonSearch").value);
}

function renderLesson(lesson) {
  if (!lessonIsAvailable(lesson)) {
    showToast("This lesson is included with full course access");
    return;
  }
  currentLessonId = lesson.id;
  currentTopic = lesson.topic;
  state.lastCourse = currentCourseId;
  state.lastLesson = lesson.id;
  saveState();
  const courseIndex = currentCourse.lessons.findIndex((candidate) => candidate.id === lesson.id);
  const complete = state.completed.includes(lesson.id);
  document.getElementById("lessonPosition").textContent = `Lesson ${courseIndex + 1} of ${currentCourse.lessons.length}`;
  document.getElementById("lessonTitle").textContent = `${lesson.code} ${lesson.title}`;
  document.getElementById("lessonMeta").textContent = `Topic ${lesson.topic} · ${topicName(currentCourse, lesson.topic)}`;
  document.getElementById("metaCourse").textContent = currentCourse.code;
  document.getElementById("metaTopic").textContent = `${lesson.topic} · ${topicName(currentCourse, lesson.topic)}`;
  document.getElementById("metaDuration").textContent = formatDuration(lesson.seconds);
  renderLessonPractice(lesson);
  const completeButton = document.getElementById("completeButton");
  completeButton.classList.toggle("is-complete", complete);
  completeButton.lastElementChild.textContent = complete ? "Completed" : "Mark complete";
  const navigationLessons = salesPreviewMode ? salesPreviewLessons() : currentCourse.lessons;
  const navigationIndex = navigationLessons.findIndex((candidate) => candidate.id === lesson.id);
  document.getElementById("previousLesson").disabled = navigationIndex <= 0;
  document.getElementById("nextLesson").disabled = navigationIndex >= navigationLessons.length - 1;
  const frame = document.getElementById("videoFrame");
  const nextSource = `https://iframe.mediadelivery.net/embed/${library.libraryId}/${lesson.id}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  if (frame.src !== nextSource) {
    document.getElementById("videoLoading").classList.remove("is-hidden");
    frame.src = nextSource;
    frame.onload = () => document.getElementById("videoLoading").classList.add("is-hidden");
  }
}

function renderLessonPractice(lesson) {
  const panel = document.getElementById("lessonPractice");
  const practice = practiceLibrary?.lessons?.[lesson.id];
  panel.hidden = !practice;
  if (!practice) {
    setPracticeExpanded(false);
    return;
  }

  const questionCount = practice.questionIds.length;
  document.getElementById("practiceCount").textContent = `${questionCount} question${questionCount === 1 ? "" : "s"}`;

  const frame = document.getElementById("practiceFrame");
  const bankFile = practice.bankPath || "ib-bank.html";
  const url = new URL(`/public/question-bank/${bankFile}`, window.location.href);
  url.searchParams.set("renderer", "20261020-1");
  url.searchParams.set("embedded", "1");
  url.searchParams.set("practice", "1");
  // Shared SL-and-HL lessons reuse the same question IDs, but each bank
  // carries course-specific difficulty grades. Always render IB practice in
  // the course currently being reviewed so an SL question can correctly move
  // from red in SL to orange in HL.
  url.searchParams.set("course", bankFile === "ib-bank.html" ? currentCourse.code : practice.course);
  url.searchParams.set("displayCourse", currentCourse.code);
  // Every AI paper permits a calculator, so paper-number badges add no useful
  // revision information there. AA keeps its paper/calculator labels.
  if (currentCourse.code.startsWith("AI ")) {
    url.searchParams.set("hidePaper", "1");
  }
  url.searchParams.set("ids", practice.questionIds.join(","));
  if (practice.questionParts) {
    url.searchParams.set("parts", JSON.stringify(practice.questionParts));
  }
  if (practice.questionPartLabels) {
    url.searchParams.set("partLabels", JSON.stringify(practice.questionPartLabels));
  }
  if (practice.questionPartTexts) {
    url.searchParams.set("partTexts", JSON.stringify(practice.questionPartTexts));
  }
  if (practice.questionPartTitles) {
    url.searchParams.set("partTitles", JSON.stringify(practice.questionPartTitles));
  }
  if (practice.questionBodies) {
    url.searchParams.set("bodies", JSON.stringify(practice.questionBodies));
  }
  if (practice.questionDifficulties) {
    url.searchParams.set("difficulties", JSON.stringify(practice.questionDifficulties));
  }
  url.searchParams.set("solutions", "1");
  if (frame.src !== url.href) {
    document.getElementById("practiceFrameWrap").style.height = "660px";
    frame.src = url.href;
  }
}

function syncPracticeFrameScroll(expanded) {
  const frame = document.getElementById("practiceFrame");
  if (!frame?.contentWindow) return;
  frame.contentWindow.postMessage({ type: "mrflynnib-question-bank-scroll", enabled: expanded }, window.location.origin);
}

function setPracticeExpanded(expanded) {
  const panel = document.getElementById("lessonPractice");
  const button = document.getElementById("practiceExpandButton");
  panel.classList.toggle("is-expanded", expanded);
  document.body.classList.toggle("practice-expanded", expanded);
  button.setAttribute("aria-pressed", String(expanded));
  button.lastElementChild.textContent = expanded ? "Close expanded view" : "Expand practice";
  syncPracticeFrameScroll(expanded);
}

function renderLessonList(query = "") {
  const list = document.getElementById("lessonList");
  const normalized = query.trim().toLowerCase();
  let lessons = normalized
    ? currentCourse.lessons.filter((lesson) => `${lesson.code} ${lesson.title} ${topicName(currentCourse, lesson.topic)} ${lesson.scope}`.toLowerCase().includes(normalized))
    : currentCourse.topics.find((topic) => topic.number === currentTopic)?.lessons || [];

  const headingTopic = normalized ? "All topics" : `Topic ${currentTopic}`;
  const headingTitle = normalized ? "Search results" : topicName(currentCourse, currentTopic);
  document.getElementById("curriculumEyebrow").textContent = headingTopic;
  document.getElementById("curriculumTitle").textContent = headingTitle;
  document.getElementById("curriculumCount").textContent = `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}`;

  if (!lessons.length) {
    list.innerHTML = '<p class="no-results">No lessons match that search.</p>';
    return;
  }

  let previousTopic = null;
  list.innerHTML = lessons.map((lesson) => {
    const heading = normalized && lesson.topic !== previousTopic
      ? `<div class="lesson-group-label">Topic ${lesson.topic} · ${escapeHtml(topicName(currentCourse, lesson.topic))}</div>`
      : "";
    previousTopic = lesson.topic;
    const complete = state.completed.includes(lesson.id);
    const practice = practiceLibrary?.lessons?.[lesson.id];
    const locked = !lessonIsAvailable(lesson);
    return `${heading}<button class="lesson-item ${lesson.id === currentLessonId ? "is-active" : ""} ${complete ? "is-complete" : ""} ${locked ? "is-locked" : ""}" type="button" data-lesson-id="${lesson.id}" aria-label="${locked ? "Locked lesson: " : "Open lesson: "}${escapeHtml(`${lesson.code} ${lesson.title}`)}">
      <span class="lesson-state">${locked ? "⌑" : complete ? "✓" : "▶"}</span>
      <span><strong>${escapeHtml(`${lesson.code} ${lesson.title}`)}</strong><small>${locked ? "Full course" : `${formatDuration(lesson.seconds)}${lesson.status === 4 ? "" : " · Processing"}${practice ? " · Practice" : ""}`}</small></span>
    </button>`;
  }).join("");
}

window.addEventListener("message", async (event) => {
  const frame = document.getElementById("practiceFrame");
  if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
  const message = event.data;
  if (!message?.type) return;

  if (message.type === "mrflynnib-question-bank-height") {
    const height = Math.min(Math.max(Number(message.height) || 660, 420), 5200);
    document.getElementById("practiceFrameWrap").style.height = `${height}px`;
    return;
  }

  if (message.type === "mrflynnib-question-bank-ready") {
    sendPracticeAccountState(event.source);
    return;
  }

  if (message.type === "mrflynnib-progress-set") {
    const key = practiceQuestionKey(String(message.questionId));
    const completed = new Set(state.practiceCompleted);
    if (message.completed) completed.add(key);
    else completed.delete(key);
    state.practiceCompleted = [...completed];
    saveState();
    event.source.postMessage({
      type: "mrflynnib-progress-result",
      questionId: String(message.questionId),
      completed: Boolean(message.completed),
      ok: true,
    }, window.location.origin);
    return;
  }

  if (message.type === "mrflynnib-whiteboard-load") {
    try {
      const document = await getSavedWhiteboard(String(message.questionId));
      event.source.postMessage({
        type: "mrflynnib-whiteboard-data",
        questionId: String(message.questionId),
        document,
        ok: true,
      }, window.location.origin);
    } catch {
      event.source.postMessage({
        type: "mrflynnib-whiteboard-data",
        questionId: String(message.questionId),
        document: null,
        ok: false,
      }, window.location.origin);
    }
    return;
  }

  if (message.type === "mrflynnib-whiteboard-save") {
    try {
      await saveWhiteboard(String(message.questionId), message.document);
      event.source.postMessage({
        type: "mrflynnib-whiteboard-save-result",
        questionId: String(message.questionId),
        ok: true,
      }, window.location.origin);
    } catch (error) {
      event.source.postMessage({
        type: "mrflynnib-whiteboard-save-result",
        questionId: String(message.questionId),
        ok: false,
        reason: error?.name === "QuotaExceededError" ? "too-large" : "storage-error",
      }, window.location.origin);
    }
  }
});

function moveLesson(direction) {
  const navigationLessons = salesPreviewMode ? salesPreviewLessons() : currentCourse.lessons;
  const currentIndex = navigationLessons.findIndex((lesson) => lesson.id === currentLessonId);
  const next = navigationLessons[currentIndex + direction];
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
  document.getElementById("progressCourseGrid").innerHTML = enrolledCourseDefinitions.map((definition) => {
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
  const tabs = document.getElementById("pastPaperCourseTabs");
  const definitions = enrolledCourseDefinitions.filter((definition) => pastPaperLibrary.courses?.[definition.code]);
  tabs.classList.toggle("is-single-course", definitions.length === 1);
  tabs.innerHTML = definitions.map((definition) => {
    const stats = pastPaperLibrary.stats[definition.code];
    const Tag = reviewerMode ? "button" : "div";
    const attributes = reviewerMode ? `type="button" data-past-course="${definition.code}"` : `aria-label="Your enrolled course"`;
    return `<${Tag} class="past-paper-course-tab ${definition.code === currentPastPaperCourse ? "is-active" : ""}" ${attributes}>
      <span>${definition.code}</span>
      <strong>${escapeHtml(definition.name)}</strong>
      <small>${stats.papers} papers · ${stats.questions} solutions</small>
    </${Tag}>`;
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
  if (!sets.length) {
    document.getElementById("pastPaperSetList").innerHTML = '<p class="no-results">No papers match this session.</p>';
    return;
  }

  const yearGroups = [];
  for (const set of sets) {
    const year = set.session.match(/\b20\d{2}\b/)?.[0] || "Specimen";
    const session = set.session.replace(/\s*\b20\d{2}\b\s*/, "").trim() || "Specimen";
    let yearGroup = yearGroups.find((group) => group.year === year);
    if (!yearGroup) {
      yearGroup = { year, sessions: [] };
      yearGroups.push(yearGroup);
    }
    let sessionGroup = yearGroup.sessions.find((group) => group.session === session);
    if (!sessionGroup) {
      sessionGroup = { session, sets: [] };
      yearGroup.sessions.push(sessionGroup);
    }
    sessionGroup.sets.push(set);
  }

  document.getElementById("pastPaperSetList").innerHTML = yearGroups.map((yearGroup) => `<section class="paper-year-group">
    <h3 class="paper-year-heading">${escapeHtml(yearGroup.year)}</h3>
    ${yearGroup.sessions.map((sessionGroup) => `<div class="paper-session-group">
      <p class="paper-session-heading">${escapeHtml(sessionGroup.session === "Specimen" ? "Official specimen papers" : `${sessionGroup.session} session`)}</p>
      ${sessionGroup.sets.map((set) => {
        const meta = [set.timezone, set.paper].filter(Boolean).join(" · ");
        return `<button class="paper-set-card ${set.id === currentPastPaperSetId ? "is-active" : ""}" type="button" data-paper-set-id="${set.id}">
          <span><strong>${escapeHtml(meta)}</strong><em>${set.questions.length} worked solution${set.questions.length === 1 ? "" : "s"}</em></span>
          <i aria-hidden="true">→</i>
        </button>`;
      }).join("")}
    </div>`).join("")}
  </section>`).join("");
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
  if (!pastPaperLibrary.stats[currentPastPaperCourse]) currentPastPaperCourse = "AA HL";
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
document.getElementById("practiceExpandButton").addEventListener("click", () => {
  const panel = document.getElementById("lessonPractice");
  setPracticeExpanded(!panel.classList.contains("is-expanded"));
});
document.getElementById("practiceFrame").addEventListener("load", () => {
  syncPracticeFrameScroll(document.getElementById("lessonPractice").classList.contains("is-expanded"));
});
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
  state.practiceCompleted = [];
  state.lastCourse = enrolledCourseId;
  state.lastLesson = courses[enrolledCourseId].lessons[0]?.id || null;
  currentCourseId = enrolledCourseId;
  currentCourse = courses[currentCourseId];
  currentLessonId = state.lastLesson;
  currentTopic = 1;
  saveState();
  accountMenu.hidden = true;
  renderDashboard();
  renderCourseCards();
  renderProgress();
  if (document.getElementById("courseView").classList.contains("is-visible")) renderCourse();
  const practiceFrame = document.getElementById("practiceFrame");
  if (practiceFrame?.contentWindow) sendPracticeAccountState(practiceFrame.contentWindow);
  showToast("Prototype progress reset");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (document.getElementById("lessonPractice").classList.contains("is-expanded")) {
      setPracticeExpanded(false);
      return;
    }
    closeSidebar();
  }
});

const enrolledCourse = courses[enrolledCourseId];
const visibleLessonCount = reviewerMode
  ? enrolledCourseDefinitions.reduce((total, definition) => total + courses[definition.id].lessons.length, 0)
  : enrolledCourse.lessons.length;
document.getElementById("sidebarVideoCount").textContent = visibleLessonCount;
document.getElementById("summaryVideos").textContent = visibleLessonCount;

configurePreviewMode();
renderDashboard();
renderCourseCards();
renderProgress();
if (reviewerMode) {
  setView("courses");
} else if (validPreviewCourseId) {
  const requestedTopic = Number.isInteger(previewTopic) && previewTopic > 0 ? previewTopic : 1;
  const requestedLesson = courses[validPreviewCourseId].topics.find((topic) => topic.number === requestedTopic)?.lessons[0];
  openCourse(validPreviewCourseId, requestedLesson?.id || null);
}
