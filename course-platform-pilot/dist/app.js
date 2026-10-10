const lessons = [
  { id: "95399e03-4f3d-47dd-8a88-41c986b50d91", code: "1.1", title: "Scientific notation", seconds: 644, group: "Foundations" },
  { id: "e533a89a-2e12-47b6-a54c-534a461dcb04", code: "1.2.1", title: "Arithmetic sequences and series", seconds: 733, group: "Sequences and series" },
  { id: "73d396dd-da8e-46da-8548-2ae1cf533440", code: "1.2.2", title: "Sigma notation", seconds: 305, group: "Sequences and series" },
  { id: "6c582652-bd66-470e-9511-48be5574a322", code: "1.3", title: "Geometric sequences and series", seconds: 832, group: "Sequences and series" },
  { id: "e6cca689-8f8c-4d4d-8566-7dff6e20a096", code: "1.4.1", title: "Compound interest", seconds: 711, group: "Financial mathematics" },
  { id: "b3abcb64-544d-4926-bdc3-3861a2725078", code: "1.4.2", title: "Depreciation", seconds: 381, group: "Financial mathematics" },
  { id: "c88c6fdf-8038-45e4-9598-7eeed57f8f6f", code: "1.4.3", title: "Inflation", seconds: 328, group: "Financial mathematics" },
  { id: "7096456c-bd06-4c4f-9ac3-f2314a2fa334", code: "1.5.1", title: "Laws of exponents", seconds: 244, group: "Exponents and logarithms" },
  { id: "9f18b254-9055-436f-bbc8-4761ca34d5b7", code: "1.5.2", title: "Introduction to logs", seconds: 475, group: "Exponents and logarithms" },
  { id: "35488928-8daf-4e41-9e34-60c9153b0b8c", code: "1.5.3", title: "The number e", seconds: 625, group: "Exponents and logarithms" },
  { id: "111f8aa4-20e2-41a1-8665-a1252556f0a0", code: "1.6", title: "Simple deductive proofs", seconds: 505, group: "Proof" },
  { id: "4e377a7a-be35-4b76-bcbc-3684974dfaf9", code: "1.7.1", title: "More exponents", seconds: 755, group: "Extending exponents and logs" },
  { id: "cf573eb5-7cdc-4534-a90b-faa307f6e5ff", code: "1.7.2", title: "Laws of logs", seconds: 601, group: "Extending exponents and logs" },
  { id: "64faaf0b-493f-4916-bbde-7ef666e2e7b4", code: "1.7.3", title: "Change of base", seconds: 517, group: "Extending exponents and logs" },
  { id: "b492d0cc-b491-46aa-ba1e-48cf199ff207", code: "1.8", title: "Sum of an infinite geometric sequence", seconds: 465, group: "Equations and sequences" },
  { id: "24e9be00-6958-4b90-a7a3-5ba5ad8c16f9", code: "1.8.1", title: "Systems of linear equations", seconds: 197, group: "Equations and sequences" },
  { id: "6d2ca245-7a2a-45ec-ae5c-5e6b7ac692eb", code: "1.8.2", title: "Roots of a polynomial", seconds: 363, group: "Equations and sequences" },
  { id: "f2db55ba-d9f3-48b2-976e-4d6fc8a35031", code: "1.9.1", title: "Binomial expansion: introduction and full expansion", seconds: 1216, group: "The binomial theorem" },
  { id: "127d3689-f30e-47ea-bbe3-98c8dccf4967", code: "1.9.2", title: "Binomial expansion: finding a term", seconds: 704, group: "The binomial theorem" }
];

const descriptions = {
  "Foundations": "Build a confident foundation in the notation and number skills used throughout the IB Mathematics course.",
  "Sequences and series": "Develop the patterns, notation and methods needed to work accurately with arithmetic and geometric sequences.",
  "Financial mathematics": "Apply sequences and exponential models to real financial situations including growth, depreciation and inflation.",
  "Exponents and logarithms": "Connect exponent rules, logarithms and the number e through clear worked examples.",
  "Proof": "Learn how to structure a simple deductive argument and communicate mathematical reasoning clearly.",
  "Extending exponents and logs": "Extend the core rules and use them flexibly when simplifying expressions and solving problems.",
  "Equations and sequences": "Bring algebraic methods together to solve equations and reason about roots and infinite sums.",
  "The binomial theorem": "Understand how binomial expansions are built and how to identify a particular term efficiently."
};

const storageKey = "mrflynnib-course-pilot-v1";
let state = loadState();
let currentLessonIndex = Math.max(0, lessons.findIndex((lesson) => lesson.id === state.lastLesson));
let currentCourse = state.course === "HL" ? "HL" : "SL";
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return { completed: Array.isArray(saved?.completed) ? saved.completed : [], lastLesson: saved?.lastLesson || lessons[0].id, course: saved?.course || "SL" };
  } catch {
    return { completed: [], lastLesson: lessons[0].id, course: "SL" };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function duration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function completedCount() { return state.completed.filter((id) => lessons.some((lesson) => lesson.id === id)).length; }
function percent() { return Math.round((completedCount() / lessons.length) * 100); }

function nextIncompleteIndex() {
  const index = lessons.findIndex((lesson) => !state.completed.includes(lesson.id));
  return index === -1 ? lessons.length - 1 : index;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === `${viewName}View`));
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewName || (viewName === "course" && button.dataset.view === "courses")));
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "progress") renderProgressView();
}

function openCourse(level, lessonIndex = null) {
  currentCourse = level === "HL" ? "HL" : "SL";
  state.course = currentCourse;
  if (lessonIndex !== null) currentLessonIndex = lessonIndex;
  state.lastLesson = lessons[currentLessonIndex].id;
  saveState();
  renderCourse();
  setView("course");
}

function renderCourse() {
  const lesson = lessons[currentLessonIndex];
  const lessonComplete = state.completed.includes(lesson.id);
  const levelLabel = `AA ${currentCourse}`;
  document.getElementById("courseCode").textContent = levelLabel;
  document.getElementById("courseName").textContent = `Analysis & Approaches ${currentCourse}`;
  document.getElementById("lessonPosition").textContent = `Lesson ${currentLessonIndex + 1} of ${lessons.length}`;
  document.getElementById("lessonTitle").textContent = `${lesson.code} ${lesson.title}`;
  document.getElementById("lessonDuration").textContent = duration(lesson.seconds);
  document.getElementById("lessonDescription").textContent = descriptions[lesson.group];
  document.getElementById("metaCourse").textContent = "AA SL and AA HL";
  document.getElementById("coursePercent").textContent = `${percent()}%`;
  document.getElementById("courseProgress").style.width = `${percent()}%`;
  const completeButton = document.getElementById("completeButton");
  completeButton.classList.toggle("is-complete", lessonComplete);
  completeButton.lastElementChild.textContent = lessonComplete ? "Completed" : "Mark complete";
  document.getElementById("previousLesson").disabled = currentLessonIndex === 0;
  document.getElementById("nextLesson").disabled = currentLessonIndex === lessons.length - 1;
  document.getElementById("videoLoading").classList.remove("is-hidden");
  const videoFrame = document.getElementById("videoFrame");
  videoFrame.src = `https://iframe.mediadelivery.net/embed/775873/${lesson.id}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;
  videoFrame.onload = () => document.getElementById("videoLoading").classList.add("is-hidden");
  renderLessonList(document.getElementById("lessonSearch").value);
  updateSharedProgress();
}

function renderLessonList(query = "") {
  const list = document.getElementById("lessonList");
  const normalizedQuery = query.trim().toLowerCase();
  const matchingLessons = lessons.map((lesson, index) => ({ lesson, index })).filter(({ lesson }) => `${lesson.code} ${lesson.title} ${lesson.group}`.toLowerCase().includes(normalizedQuery));
  if (!matchingLessons.length) {
    list.innerHTML = '<p class="no-results">No lessons match that search.</p>';
    return;
  }
  let currentGroup = "";
  list.innerHTML = matchingLessons.map(({ lesson, index }) => {
    const groupHeading = lesson.group !== currentGroup ? `<div class="lesson-group-label">${lesson.group}</div>` : "";
    currentGroup = lesson.group;
    const isComplete = state.completed.includes(lesson.id);
    return `${groupHeading}<button class="lesson-item ${index === currentLessonIndex ? "is-active" : ""} ${isComplete ? "is-complete" : ""}" type="button" data-lesson-index="${index}">
      <span class="lesson-number">${isComplete ? "✓" : index + 1}</span>
      <span><span class="lesson-item-title">${lesson.code} ${lesson.title}</span><span class="lesson-item-duration">${duration(lesson.seconds)}</span></span>
      <span class="play-indicator">${index === currentLessonIndex ? "Playing" : ""}</span>
    </button>`;
  }).join("");
}

function updateSharedProgress() {
  const count = completedCount();
  const completionPercent = percent();
  const nextIndex = nextIncompleteIndex();
  const next = lessons[nextIndex];
  document.getElementById("sidebarCourseLevel").textContent = currentCourse;
  document.getElementById("sidebarProgress").style.width = `${completionPercent}%`;
  document.getElementById("sidebarProgressLabel").textContent = `${count} of ${lessons.length} complete`;
  document.getElementById("continueProgress").style.width = `${completionPercent}%`;
  document.getElementById("continueProgressLabel").textContent = `${completionPercent}% complete`;
  document.getElementById("continueLessonCount").textContent = `${count} / ${lessons.length} lessons`;
  document.getElementById("continueTitle").textContent = `${next.code} ${next.title}`;
  document.getElementById("continueCoursePill").textContent = `AA ${currentCourse}`;
  document.getElementById("continueButton").dataset.openCourse = currentCourse;
  document.getElementById("dashboardCompleted").textContent = `${count} lesson${count === 1 ? "" : "s"} completed`;
}

function renderProgressView() {
  const count = completedCount();
  const completionPercent = percent();
  document.getElementById("progressDonut").style.setProperty("--progress", `${completionPercent * 3.6}deg`);
  document.getElementById("donutPercent").textContent = `${completionPercent}%`;
  document.getElementById("completedStat").textContent = count;
  document.getElementById("remainingStat").textContent = lessons.length - count;
  document.getElementById("progressHeadline").textContent = count === lessons.length ? "Topic 1 complete" : count ? "Good progress" : "Ready to begin";
  document.getElementById("progressSummary").textContent = count === lessons.length ? "You have completed every lesson in this pilot topic." : `You have ${lessons.length - count} lesson${lessons.length - count === 1 ? "" : "s"} left in Topic 1.`;
  document.getElementById("completionList").innerHTML = lessons.map((lesson) => {
    const isComplete = state.completed.includes(lesson.id);
    return `<div class="completion-row ${isComplete ? "is-complete" : ""}"><span class="state">✓</span><strong>${lesson.code} ${lesson.title}</strong><small>${duration(lesson.seconds)}</small></div>`;
  }).join("");
}

function toggleComplete() {
  const lesson = lessons[currentLessonIndex];
  if (state.completed.includes(lesson.id)) {
    state.completed = state.completed.filter((id) => id !== lesson.id);
    showToast("Lesson marked as not complete");
  } else {
    state.completed.push(lesson.id);
    showToast("Lesson completed");
  }
  saveState();
  renderCourse();
}

function moveLesson(direction) {
  const nextIndex = currentLessonIndex + direction;
  if (nextIndex < 0 || nextIndex >= lessons.length) return;
  currentLessonIndex = nextIndex;
  state.lastLesson = lessons[currentLessonIndex].id;
  saveState();
  renderCourse();
  document.getElementById("courseView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openSidebar() { document.getElementById("sidebar").classList.add("is-open"); document.getElementById("sidebarScrim").classList.add("is-open"); }
function closeSidebar() { document.getElementById("sidebar").classList.remove("is-open"); document.getElementById("sidebarScrim").classList.remove("is-open"); }

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) setView(viewButton.dataset.view);
  const courseButton = event.target.closest("[data-open-course]");
  if (courseButton) openCourse(courseButton.dataset.openCourse, courseButton.id === "continueButton" ? nextIncompleteIndex() : null);
  const lessonButton = event.target.closest("[data-lesson-index]");
  if (lessonButton) {
    currentLessonIndex = Number(lessonButton.dataset.lessonIndex);
    state.lastLesson = lessons[currentLessonIndex].id;
    saveState();
    renderCourse();
    if (window.innerWidth < 841) document.getElementById("videoShell").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("is-active", button === tabButton));
    document.getElementById("overviewPanel").hidden = tabButton.dataset.tab !== "overview";
    document.getElementById("resourcesPanel").hidden = tabButton.dataset.tab !== "resources";
  }
});

document.getElementById("openMenu").addEventListener("click", openSidebar);
document.getElementById("closeMenu").addEventListener("click", closeSidebar);
document.getElementById("sidebarScrim").addEventListener("click", closeSidebar);
document.getElementById("continueButton").dataset.openCourse = currentCourse;
document.getElementById("completeButton").addEventListener("click", toggleComplete);
document.getElementById("previousLesson").addEventListener("click", () => moveLesson(-1));
document.getElementById("nextLesson").addEventListener("click", () => moveLesson(1));
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
document.getElementById("showLogin").addEventListener("click", () => { accountMenu.hidden = true; loginDialog.showModal(); });
document.getElementById("closeLogin").addEventListener("click", () => loginDialog.close());
document.getElementById("prototypeLoginForm").addEventListener("submit", (event) => { event.preventDefault(); loginDialog.close(); showToast("Prototype sign-in successful"); });

const helpDialog = document.getElementById("helpDialog");
document.getElementById("helpButton").addEventListener("click", () => helpDialog.showModal());
document.getElementById("closeHelp").addEventListener("click", () => helpDialog.close());

document.getElementById("resetProgress").addEventListener("click", () => {
  state.completed = [];
  state.lastLesson = lessons[0].id;
  currentLessonIndex = 0;
  saveState();
  accountMenu.hidden = true;
  updateSharedProgress();
  renderProgressView();
  if (document.getElementById("courseView").classList.contains("is-visible")) renderCourse();
  showToast("Prototype progress reset");
});

document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSidebar(); });

updateSharedProgress();
renderProgressView();
renderLessonList();
