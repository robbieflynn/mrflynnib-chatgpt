const library = window.MR_FLYNN_LIBRARY;
const igcseLibrary = window.MR_FLYNN_IGCSE_LIBRARY;
const ibPastPaperLibrary = window.MR_FLYNN_PAST_PAPERS;
const igcsePastPaperLibrary = window.MR_FLYNN_IGCSE_PAST_PAPERS || { stats: {}, courses: {} };
const pastPaperLibrary = {
  libraryId: ibPastPaperLibrary.libraryId,
  stats: { ...ibPastPaperLibrary.stats, ...igcsePastPaperLibrary.stats },
  courses: { ...ibPastPaperLibrary.courses, ...igcsePastPaperLibrary.courses },
};
const practiceLibrary = window.MR_FLYNN_PRACTICE;
const previewParameters = new URLSearchParams(window.location.search);
const previewMode = previewParameters.get("v");
const requestedCurriculum = previewParameters.get("curriculum");
const reviewCurriculum = previewMode === "igcse-platform-review"
  ? "igcse"
  : previewMode === "ib-platform-review" || previewMode === "all-courses-review"
    ? "ib"
    : null;
const reviewerMode = Boolean(reviewCurriculum);
const salesPreviewMode = previewMode?.startsWith("course-preview-") || false;
const previewCourseId = salesPreviewMode
  ? previewMode.replace("course-preview-", "")
  : previewMode?.startsWith("single-course-")
    ? previewMode.replace("single-course-", "")
    : null;
const requestedCourseId = previewParameters.get("course");
const requestedView = previewParameters.get("view");
const previewTopic = Number(previewParameters.get("topic"));
const activeCurriculum = () => platformAccount?.curriculum || (requestedCurriculum === "igcse" || requestedCourseId === "igcse" ? "igcse" : "ib");

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
    accent: "indigo",
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

// Review URLs can still pin a course for visual QA. Normal learners receive
// their curriculum and access state from the authenticated bootstrap route.
const validPreviewCourseId = courseDefinitions.some((definition) => definition.id === previewCourseId)
  ? previewCourseId
  : null;
const requestedReviewCourseId = courseDefinitions.some((definition) => definition.id === requestedCourseId)
  ? requestedCourseId
  : null;
const defaultCourseId = reviewCurriculum === "igcse" || requestedCurriculum === "igcse"
  ? "igcse"
  : requestedReviewCourseId || validPreviewCourseId || "aa-hl";
let enrolledCourseIds = reviewerMode
  ? [defaultCourseId]
  : [defaultCourseId];
let ownedCourseIds = [];
let enrolledCourseDefinitions = courseDefinitions.filter((definition) => enrolledCourseIds.includes(definition.id));
let enrolledCourseId = defaultCourseId;
let platformAccount = null;
let guestMode = false;
let signOutDestination = "/account";

const storageKey = "mrflynnib-course-platform-v3";
const practiceDatabaseName = "mrflynnib-course-preview";
const practiceDatabaseVersion = 1;
const practiceWhiteboardStore = "whiteboards";
let state = loadState();
let currentCourseId = enrolledCourseIds.includes(requestedCourseId) ? requestedCourseId : enrolledCourseIds.includes(state.lastCourse) ? state.lastCourse : enrolledCourseId;
let currentCourse = courses[currentCourseId];
let currentLessonId = null;
let currentTopic = 1;
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
      if (!saved.pendingLessonProgress || typeof saved.pendingLessonProgress !== "object") saved.pendingLessonProgress = {};
      return saved;
    }
  } catch {}
  return { completed: [], practiceCompleted: [], pendingLessonProgress: {}, lastCourse: enrolledCourseId, lastLesson: null };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

async function syncLessonProgress(courseId, lessonId, completed) {
  if (!platformAccount || reviewerMode || salesPreviewMode) return;
  state.pendingLessonProgress ||= {};
  state.pendingLessonProgress[`${courseId}:${lessonId}`] = completed;
  saveState();
  try {
    const response = await fetch("/api/platform/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, lessonId, completed }) });
    if (!response.ok) throw new Error("save failed");
    delete state.pendingLessonProgress[`${courseId}:${lessonId}`];
    saveState();
  } catch {
    showToast("Saved on this device. We will sync it when the connection returns.");
  }
}

async function flushLessonProgress() {
  const pending = Object.entries(state.pendingLessonProgress || {});
  for (const [key, completed] of pending) {
    const separator = key.indexOf(":");
    await syncLessonProgress(key.slice(0, separator), key.slice(separator + 1), completed);
  }
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
    localOnly: !platformAccount,
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

function completedIn(lessons) {
  return lessons.filter((lesson) => state.completed.includes(lesson.id)).length;
}

function percentIn(lessons) {
  return lessons.length ? Math.round((completedIn(lessons) / lessons.length) * 100) : 0;
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
    return;
  }
  document.body.classList.add("reviewer-mode");
  const isIgcse = reviewCurriculum === "igcse";
  document.body.classList.toggle("igcse-learning", isIgcse);
  document.title = `${isIgcse ? "IGCSE" : "IB"} platform review | Mr Flynn IB`;
  document.getElementById("sidebarCourseLabel").textContent = isIgcse ? "Edexcel IGCSE Mathematics" : courses[currentCourseId].name;
  document.getElementById("welcomeEyebrow").textContent = "Free course preview";
  document.getElementById("welcomeTitle").textContent = isIgcse ? "Try the IGCSE course" : `Try the ${courses[currentCourseId].code} course`;
  const freeLessonCount = salesPreviewLessons(courses[currentCourseId]).length;
  document.getElementById("welcomeCopy").textContent = "Three carefully chosen lessons in every topic are free. Each includes the video and its attached practice questions.";
  document.getElementById("libraryStatusText").textContent = `${freeLessonCount} complete lessons free`;
  document.getElementById("enrolmentEyebrow").textContent = "Your selected course";
  document.getElementById("dashboardCoursesTitle").textContent = courses[currentCourseId].name;
  document.getElementById("dashboardCoursesButton").textContent = "View syllabus →";
  document.getElementById("coursesEyebrow").textContent = "My course";
  document.getElementById("coursesTitle").textContent = courses[currentCourseId].name;
  document.getElementById("coursesDescription").textContent = "Free lessons are ready to watch. The complete syllabus stays visible so you can see exactly what full course access includes.";
  document.getElementById("courseBackButton").textContent = "← Learning home";
  document.getElementById("summaryTopics").textContent = String(enrolledCourseDefinitions.reduce((total, definition) => total + courses[definition.id].topics.length, 0));
  document.getElementById("summaryTopicsLabel").textContent = "course topics";
  const reviewHome = `/platform-review?curriculum=${isIgcse ? "igcse" : "ib"}&role=student`;
  document.getElementById("courseBackButton").href = reviewHome;
  syncQuestionBankLink();
  document.getElementById("assignmentsLink").href = `${reviewHome}&screen=assignment`;
  document.getElementById("accessLink").href = isIgcse ? "/igcse/account/access" : "/account/access";
  document.getElementById("manageAccessLink").href = isIgcse ? "/igcse/account/access" : "/account/access";
  document.getElementById("learningHomeLink").href = reviewHome;
  document.getElementById("primaryLearningHomeLink").href = reviewHome;
  document.getElementById("topbarLearningHomeLink").href = reviewHome;
  document.getElementById("brandLearningHomeLink").href = reviewHome;
}

function configureCurriculumExperience(curriculum) {
  const isIgcse = curriculum === "igcse";
  document.body.classList.toggle("igcse-learning", isIgcse);
  document.title = isIgcse ? "IGCSE Mathematics course | Mr Flynn" : "My learning | Mr Flynn IB";
  document.getElementById("brandLearningHomeLink").setAttribute("aria-label", isIgcse ? "Back to IGCSE Mathematics" : "Back to My learning");
  signOutDestination = isIgcse ? "/igcse/account" : "/account";
  const legacyCourseHref = isIgcse ? "/go/igcse-course" : "/go/my-courses";
  document.getElementById("topbarLegacyCourseLink").href = legacyCourseHref;
  document.getElementById("topbarLegacyCourseLink").hidden = isIgcse;
  document.getElementById("legacyCourseLink").href = legacyCourseHref;
  const hasPastPapers = enrolledCourseDefinitions.some((definition) => pastPaperLibrary.courses?.[definition.code]);
  document.querySelectorAll('[data-view="pastPapers"]').forEach((element) => { element.hidden = !hasPastPapers; });
  document.querySelector(".study-paths")?.classList.toggle("is-single-path", !hasPastPapers);
}

function questionBankHrefForCourse(courseId = currentCourseId) {
  const base = courseId === "igcse" ? "/igcse/question-bank" : `/question-bank/${courseId}`;
  return reviewerMode && courseId !== "igcse" ? `${base}?review=platform` : base;
}

function syncQuestionBankLink() {
  document.getElementById("questionBankLink").href = questionBankHrefForCourse();
}

function isIbTeacherAccount() {
  return platformAccount?.curriculum === "ib" && ["teacher", "admin"].includes(platformAccount.user?.role);
}

function configureTeacherCourseSwitcher() {
  const switcher = document.getElementById("teacherCourseSwitcher");
  const select = document.getElementById("teacherCourseSelect");
  const visible = isIbTeacherAccount() && enrolledCourseDefinitions.length > 1;
  switcher.hidden = !visible;
  if (!visible) return;
  select.innerHTML = enrolledCourseDefinitions.map((definition) => `<option value="${definition.id}">${escapeHtml(definition.code)}</option>`).join("");
  select.value = currentCourseId;
  document.getElementById("sidebar").setAttribute("aria-label", "Teacher course navigation");
}

async function persistActiveCourse(courseId, lessonId) {
  if (!platformAccount || reviewerMode || salesPreviewMode) return;
  try {
    await fetch("/api/platform/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, lessonId }),
    });
  } catch {}
}

function getCurrentLesson() {
  return currentCourse.lessons.find((lesson) => lesson.id === currentLessonId) || currentCourse.lessons[0];
}

const curatedFreeLessonIds = {
  "aa-sl": [
    "e6cca689-8f8c-4d4d-8566-7dff6e20a096", "e533a89a-2e12-47b6-a54c-534a461dcb04", "cf573eb5-7cdc-4534-a90b-faa307f6e5ff",
    "e62cb90d-32c9-4dc7-b508-15e458124e56", "ffb4c343-0db5-45dd-b9b5-5289dba0484b", "bd083b0d-a7b1-44cc-9980-47cce4046c0d",
    "588719f5-78e2-44da-9132-970cf1ce2ebe", "c5f358f0-e49c-4fc1-a20a-296f64992376", "b49b3fd5-a955-4ba5-a569-77ec56466fe8",
    "639dc690-35bc-4a84-b7fb-89844ecaf252", "125a9218-3aed-48c9-b96b-3cf08968de9c", "f924ec98-3f94-4b6e-b485-50d9a7cb0959",
    "20b8ec75-0605-426a-abec-066ca4c4f9d2", "6b4acb2b-3242-40a3-b616-228c878585f8", "0922ca4f-d53f-4299-b9c9-eafe6d17caf1",
  ],
  "aa-hl": [
    "4e377a7a-be35-4b76-bcbc-3684974dfaf9", "044da60a-f4cd-46c6-a71f-95b0087e3bb5", "921a99b5-a673-423c-aeed-402fec0952e0",
    "529c9f56-5b88-4226-a374-0b54c32fcd15", "bd083b0d-a7b1-44cc-9980-47cce4046c0d", "990b6aba-3d06-489d-81e6-70a683d4f23a",
    "588719f5-78e2-44da-9132-970cf1ce2ebe", "2242b24b-b800-4f2c-bb5a-16bd04201870", "35a8aee0-4d48-4084-883f-fc23b5be9039",
    "f924ec98-3f94-4b6e-b485-50d9a7cb0959", "2153e754-5338-4e7e-aca4-6f0e2090c038", "4fa5e51a-f4dd-477e-b393-54f1be7266ec",
    "6b4acb2b-3242-40a3-b616-228c878585f8", "2cf30a58-a31b-47c7-a9c2-fd9bd7a49ca8", "1768c593-44ef-481a-a01b-5ad58562ce78",
  ],
  "ai-sl": [
    "2a0f7d5c-a645-4249-9da4-f473559ed27c", "d4bab5f4-84db-4cdd-8a36-845c777c7077", "afd5d455-6489-4643-a71f-f8ebe31421ce",
    "a067432b-da49-4081-877b-d31f4161c517", "15f7fd17-2c1a-47c7-ac1f-c27c6b9fbc20", "3c314627-da30-4ce3-b16f-c80816aaec14",
    "74b278eb-4d1f-4ff7-b35a-0bf29c49fb62", "4c20491d-5660-48b6-80eb-943004d1f8b0", "5b93e2db-6972-4037-ad50-d913af48e762",
    "6280cb5e-91bd-4761-b655-6b88addc1345", "afce0bd2-d3b2-48ae-a8a6-9fab49e893a3", "861b44f7-4494-4574-9972-d1613d013ba1",
    "f06c971e-bbd7-4cb2-8db5-e3abbe338077", "b31ff22b-38f1-489b-a9ce-209fa91d73e6", "dacb95b4-e21c-4bb2-9269-2823cbe5a118",
  ],
  "ai-hl": [
    "7038e65e-6cf6-4f3e-b9d5-666683bb9f97", "35b51817-4a71-4b1b-9c57-056e58fe4a94", "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f",
    "84a0811a-9a01-4f18-ab5f-bf7d28f0ca9c", "948590a2-fbea-4b15-aa2f-e93f7e54e4cd", "f75bb4d1-fc72-4587-974f-2abcd54ec855",
    "41d1e966-9bb1-4436-976e-d02187f32932", "80522e92-56ee-4aa2-ae07-9e105b2efdf0", "752f518f-e2bf-4781-b9aa-51367b8b0c05",
    "d1e6ca22-dca8-4359-b0a4-610b88e5f329", "876ad43a-c778-48f2-8c79-8a3d409cfd41", "a864173f-9449-4675-bcaf-44ecc16cd9d4",
    "c6d7188a-fc5c-4552-a901-11ee186d96c1", "660e272a-8a71-4422-8450-61a7ea1d58cf", "8f385b78-d17a-4742-831b-049b78b96673",
  ],
  igcse: [
    "cbc83cb9-d117-46ea-ac62-bb7ac362394d", "de764a82-d18a-4259-8042-26a3a4a87486", "62baae37-e03d-4e49-ae83-a9c5114e54cd",
    "0cdedfbf-26ea-489e-b9ce-f8166c7ddbbc", "2933b84a-2edd-4f9e-a768-e79a27aeeae7", "bb898f99-9f38-47fc-b1ae-6587fd81284d",
    "fb79ddd5-ef05-48a7-a489-311620a88c6b", "1ec9f03e-2faf-4349-b0ee-96686806c30b", "b6a712ae-cb1e-49bd-9b61-c86995a6d6ad",
    "1b2ba545-340e-419b-a0a2-6208f342588b", "4b8eb48d-283b-46bf-8938-bc964e29c1f4", "0dfeed4d-a6d3-420f-861c-85d6ff9f765a",
    "b2a1b37c-f7ed-4d36-abfa-932da0c6c776", "116fe4a6-4c4c-4800-b173-a95d83f251b6", "c9936059-0955-4a3d-981e-64c4ca741e51",
    "81b9c335-ac60-4ca7-88f8-0f26f696266b", "20b25248-b2b7-4f5b-b270-d68567b564d7", "1a51ff2e-8cdc-4a3d-9f0b-85cf3f65e853",
  ],
};

const initialAvailableLessons = hasCompleteCourseAccess(currentCourse) ? currentCourse.lessons : salesPreviewLessons(currentCourse);
currentLessonId = initialAvailableLessons.some((lesson) => lesson.id === state.lastLesson)
  ? state.lastLesson
  : initialAvailableLessons[0]?.id || currentCourse.lessons[0]?.id;
currentTopic = currentCourse.lessons.find((lesson) => lesson.id === currentLessonId)?.topic || 1;

function salesPreviewLessons(course = currentCourse) {
  const selectedIds = curatedFreeLessonIds[course.id] || [];
  return selectedIds.map((id) => course.lessons.find((lesson) => lesson.id === id)).filter(Boolean);
}

function isSampleLesson(lesson, course = currentCourse) {
  return salesPreviewLessons(course).some((sample) => sample.id === lesson.id);
}

function hasCompleteCourseAccess(course = currentCourse) {
  return ownedCourseIds.includes(course.id) || validPreviewCourseId === course.id && !salesPreviewMode;
}

function lessonIsAvailable(lesson) {
  if (reviewerMode || salesPreviewMode) return isSampleLesson(lesson);
  if (validPreviewCourseId && !salesPreviewMode) return true;
  if (ownedCourseIds.includes(currentCourseId)) return true;
  return salesPreviewLessons().some((sample) => sample.id === lesson.id);
}

function defaultLessonForTopic(topicNumber) {
  const topic = currentCourse.topics.find((item) => item.number === topicNumber);
  if (!topic?.lessons.length) return null;
  if (hasCompleteCourseAccess(currentCourse)) {
    return topic.lessons.find((lesson) => !state.completed.includes(lesson.id)) || topic.lessons[0];
  }
  return salesPreviewLessons(currentCourse).find((lesson) => lesson.topic === topicNumber) || topic.lessons[0];
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
  document.getElementById("myCourseButton").classList.toggle("is-active", ["dashboard", "courses", "course"].includes(viewName));
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
  const owned = hasCompleteCourseAccess(course);
  const progressLessons = owned ? course.lessons : salesPreviewLessons(course);
  const completed = completedIn(progressLessons);
  const percentage = percentIn(progressLessons);
  return `<button type="button" class="course-card ${large ? "is-large" : ""} ${owned ? "has-access" : "is-sample"} accent-${course.accent}" data-course-id="${course.id}" aria-label="Open ${escapeHtml(course.code)} course">
    <div class="course-card-art">
      ${courseArtwork(course)}
    </div>
    <div class="course-card-body">
      <div class="course-card-meta"><span>${owned ? `Your ${course.code} course` : `Try ${course.code}`}</span><span>${course.lessons.length} lessons</span></div>
      <h3>${course.name}</h3>
      <p>${course.description}</p>
      <div class="course-card-progress"><span style="width:${percentage}%"></span></div>
      <div class="course-card-footer"><small>${owned ? `${completed} of ${course.lessons.length} completed` : `${salesPreviewLessons(course).length} complete lessons free`}</small><span class="course-card-link">${owned ? "Open course" : "Try free lessons"} →</span></div>
    </div>
  </button>`;
}

function renderCourseCards() {
  const visibleCourses = isIbTeacherAccount()
    ? courseDefinitions.filter((definition) => definition.id !== "igcse").map((definition) => courses[definition.id])
    : guestMode && activeCurriculum() === "ib"
      ? courseDefinitions.filter((definition) => definition.id !== "igcse").map((definition) => courses[definition.id])
      : [currentCourse];
  const markup = visibleCourses.map((course) => courseCard(course, true)).join("");
  document.getElementById("allCourseGrid").innerHTML = markup;
}

function renderDashboard() {
  const course = courses[enrolledCourseId];
  const progressLessons = hasCompleteCourseAccess(course) ? course.lessons : salesPreviewLessons(course);
  const lastLesson = progressLessons.find((lesson) => lesson.id === state.lastLesson);
  const nextLesson = lastLesson || progressLessons.find((lesson) => !state.completed.includes(lesson.id)) || progressLessons[0] || course.lessons[0];
  const percentage = percentIn(progressLessons);
  document.getElementById("continueCourseArt").innerHTML = courseArtwork(course);
  document.getElementById("continueLessonTitle").textContent = `${nextLesson.code} ${nextLesson.title}`;
  document.getElementById("continueLessonMeta").textContent = `Topic ${nextLesson.topic}: ${topicName(course, nextLesson.topic)} · ${formatDuration(nextLesson.seconds)}`;
  document.getElementById("continueProgressLabel").textContent = `${percentage}% complete`;
  document.getElementById("continueProgressCount").textContent = `${completedIn(progressLessons)} of ${progressLessons.length} ${hasCompleteCourseAccess(course) ? "lessons" : "free lessons"}`;
  document.getElementById("continueProgressBar").style.width = `${percentage}%`;
  document.getElementById("continueButton").dataset.courseId = course.id;
  document.getElementById("continueButton").dataset.lessonId = nextLesson.id;
  document.getElementById("dashboardCoursesTitle").textContent = course.name;
  document.getElementById("dashboardCoursesButton").dataset.courseId = course.id;
  document.getElementById("dashboardCourseGrid").innerHTML = courseCard(course);
  syncQuestionBankLink();
  if (!reviewerMode && !guestMode) {
    document.getElementById("welcomeTitle").textContent = `Your ${course.code} learning space`;
    document.getElementById("welcomeCopy").textContent = "Your course lessons, question bank, assignments and progress in one place.";
    document.getElementById("sidebarCourseLabel").textContent = `${course.name}`;
  }
}

function openCourse(courseId, lessonId = null) {
  if (!courses[courseId] || !enrolledCourseIds.includes(courseId)) return;
  if (isIbTeacherAccount()) enrolledCourseId = courseId;
  currentCourseId = courseId;
  currentCourse = courses[courseId];
  const freeDefaultLesson = hasCompleteCourseAccess(currentCourse) ? null : salesPreviewLessons(currentCourse)[0]?.id;
  currentLessonId = lessonId && currentCourse.lessons.some((lesson) => lesson.id === lessonId)
    ? lessonId
    : freeDefaultLesson || currentCourse.lessons.find((lesson) => lesson.id === state.lastLesson)?.id || currentCourse.lessons[0]?.id;
  currentTopic = getCurrentLesson()?.topic || 1;
  state.lastCourse = courseId;
  state.lastLesson = currentLessonId;
  saveState();
  syncQuestionBankLink();
  configureTeacherCourseSwitcher();
  if (isIbTeacherAccount()) {
    const url = new URL(window.location.href);
    url.searchParams.set("course", courseId);
    window.history.replaceState({}, "", url);
    void persistActiveCourse(courseId, currentLessonId);
  }
  document.getElementById("lessonSearch").value = "";
  renderCourse();
  setView("course");
}

function renderTopicStrip() {
  const owned = hasCompleteCourseAccess(currentCourse);
  const freeLessons = owned ? [] : salesPreviewLessons(currentCourse);
  document.getElementById("topicStrip").innerHTML = currentCourse.topics.map((topic) => {
    const progressLessons = owned ? topic.lessons : freeLessons.filter((lesson) => lesson.topic === topic.number);
    const completed = completedIn(progressLessons);
    return `<button class="topic-button ${topic.number === currentTopic ? "is-active" : ""}" type="button" data-topic="${topic.number}">
      <span>Topic ${topic.number}</span>
      <strong>${escapeHtml(topic.name)}</strong>
      <small>${completed} / ${progressLessons.length} ${owned ? "complete" : "free lessons"}</small>
    </button>`;
  }).join("");
}

function renderCourse() {
  const lesson = getCurrentLesson();
  if (!lesson) return;
  currentTopic = lesson.topic;
  const progressLessons = hasCompleteCourseAccess(currentCourse) ? currentCourse.lessons : salesPreviewLessons(currentCourse);
  const percentage = percentIn(progressLessons);
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

function plusAccessHref() {
  const isIgcse = currentCourseId === "igcse";
  if (guestMode) return isIgcse ? "/igcse/account?mode=sign-up&next=/igcse/account/access" : `/plus?course=${encodeURIComponent(currentCourseId)}`;
  const base = isIgcse ? "/igcse/account/access" : "/account/access";
  return `${base}?course=${encodeURIComponent(currentCourseId)}`;
}

function showPlusPrompt() {
  const isIgcse = currentCourseId === "igcse";
  const dialog = document.getElementById("plusUpgradeDialog");
  document.getElementById("plusUpgradeLink").href = plusAccessHref();
  document.querySelector("#plusUpgradeDialog .eyebrow").textContent = isIgcse ? "IGCSE course access" : "Mr Flynn IB Plus";
  document.querySelector("#plusUpgradeDialog h2").textContent = isIgcse ? "Open the complete IGCSE lesson." : "Unlock the complete lesson.";
  document.querySelector("#plusUpgradeDialog h2 + p").textContent = isIgcse ? "Create an IGCSE account to save progress and review the complete course access available to you." : "Plus unlocks the complete video course and all of the extra practice questions inside its lessons.";
  document.getElementById("plusUpgradeLink").textContent = isIgcse ? guestMode ? "Create IGCSE account" : "View course access" : guestMode ? "Create account for Plus" : "Choose Plus access";
  if (!dialog.open) dialog.showModal();
}

async function loadProtectedVideo(frame, loading, videoId, kind = "lesson", locked = false) {
  if (kind === "lesson" && locked) {
    const isIgcse = currentCourseId === "igcse";
    frame.removeAttribute("src");
    loading.classList.remove("is-hidden");
    loading.classList.add("is-plus-locked");
    const posterUrl = `/api/platform/video-poster?course=${encodeURIComponent(currentCourseId)}&video=${encodeURIComponent(videoId)}&kind=lesson`;
    loading.innerHTML = `<img class="locked-video-poster" src="${posterUrl}" alt="Opening screen for this lesson" loading="eager"><span aria-hidden="true">+</span><strong>${isIgcse ? "Complete IGCSE course lesson" : "Unlock this video with Mr Flynn IB Plus"}</strong><p>You can preview the lesson questions below. Upgrade to watch the video.</p><button class="primary-button" type="button" data-plus-upgrade>${isIgcse ? "View course access" : "Unlock with Plus"}</button>`;
    return;
  }
  loading.classList.remove("is-plus-locked");
  loading.innerHTML = `<span></span><p>${kind === "past-paper" ? "Loading the worked solution…" : "Loading your lesson…"}</p>`;
  try {
    const response = await fetch(`/api/platform/video?course=${encodeURIComponent(currentCourseId)}&video=${encodeURIComponent(videoId)}&kind=${kind === "past-paper" ? "past-paper" : "lesson"}`);
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Video unavailable");
    if (frame.src !== result.url) {
      loading.classList.remove("is-hidden");
      frame.src = result.url;
      frame.onload = () => loading.classList.add("is-hidden");
    }
  } catch (error) {
    loading.classList.remove("is-hidden");
    loading.innerHTML = `<p>${escapeHtml(error?.message || "This video could not be opened.")}</p><a class="primary-button" href="${plusAccessHref()}">View course access</a>`;
  }
}

function renderLesson(lesson) {
  const locked = !lessonIsAvailable(lesson);
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
  renderLessonPractice(lesson, locked);
  const completeButton = document.getElementById("completeButton");
  completeButton.classList.toggle("is-complete", !locked && complete);
  completeButton.classList.toggle("is-plus-locked", locked);
  completeButton.dataset.plusLocked = locked ? "true" : "false";
  completeButton.firstElementChild.textContent = locked ? "+" : "✓";
  completeButton.lastElementChild.textContent = locked ? currentCourseId === "igcse" ? "View course access" : "Unlock with Plus" : complete ? "Completed" : "Mark complete";
  const navigationLessons = currentCourse.lessons;
  const navigationIndex = navigationLessons.findIndex((candidate) => candidate.id === lesson.id);
  document.getElementById("previousLesson").disabled = navigationIndex <= 0;
  document.getElementById("nextLesson").disabled = navigationIndex >= navigationLessons.length - 1;
  const frame = document.getElementById("videoFrame");
  void loadProtectedVideo(frame, document.getElementById("videoLoading"), lesson.id, "lesson", locked);
}

function renderLessonPractice(lesson, locked = false) {
  const panel = document.getElementById("lessonPractice");
  const practice = practiceLibrary?.lessons?.[lesson.id];
  panel.hidden = !practice;
  if (!practice) {
    setPracticeExpanded(false);
    return;
  }

  const questionCount = practice.questionIds.length;
  document.getElementById("practiceCount").textContent = `${questionCount} question${questionCount === 1 ? "" : "s"}`;
  document.getElementById("lessonPracticeCopy").textContent = locked
    ? currentCourseId === "igcse"
      ? "Preview this lesson here. Complete IGCSE course access unlocks the video lesson and all of its extra practice questions."
      : "Preview this lesson here. Mr Flynn IB Plus unlocks the complete video lesson and all of its extra practice questions."
    : `These are questions from the ${currentCourseId === "igcse" ? "IGCSE Mathematics" : "Mr Flynn IB"} question bank, selected for this lesson. Try each one before opening its mark scheme.`;

  const frame = document.getElementById("practiceFrame");
  const bankFile = practice.bankPath || "ib-bank.html";
  const url = new URL(`/question-bank/${bankFile}`, window.location.href);
  url.searchParams.set("renderer", "20261021-2");
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
  if (practice.questionHiddenDiagrams) {
    url.searchParams.set("hideDiagrams", practice.questionHiddenDiagrams.join(","));
  }
  if (practice.questionDifficulties) {
    url.searchParams.set("difficulties", JSON.stringify(practice.questionDifficulties));
  }
  url.searchParams.set("solutions", "1");
  if (locked) url.searchParams.set("plusPreview", "1");
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
    const lockedLabel = currentCourseId === "igcse" ? "Preview complete-course lesson: " : "Preview Plus lesson: ";
    const lockedMeta = currentCourseId === "igcse" ? "Course access" : "Plus";
    return `${heading}<button class="lesson-item ${lesson.id === currentLessonId ? "is-active" : ""} ${complete ? "is-complete" : ""} ${locked ? "is-locked" : ""}" type="button" data-lesson-id="${lesson.id}" aria-label="${locked ? lockedLabel : "Open lesson: "}${escapeHtml(`${lesson.code} ${lesson.title}`)}">
      <span class="lesson-state">${locked ? "+" : complete ? "✓" : "▶"}</span>
      <span><strong>${escapeHtml(`${lesson.code} ${lesson.title}`)}</strong><small>${locked ? `${formatDuration(lesson.seconds)}${practice ? " · Practice preview" : ""} · ${lockedMeta}` : `${formatDuration(lesson.seconds)}${lesson.status === 4 ? "" : " · Processing"}${practice ? " · Practice included" : ""}${isSampleLesson(lesson) ? " · Free lesson" : ""}`}</small></span>
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

  if (message.type === "mrflynnib-plus-required") {
    showPlusPrompt();
    return;
  }

  if (message.type === "mrflynnib-progress-set") {
    const key = practiceQuestionKey(String(message.questionId));
    const completed = new Set(state.practiceCompleted);
    if (message.completed) completed.add(key);
    else completed.delete(key);
    state.practiceCompleted = [...completed];
    saveState();
    let synced = true;
    if (platformAccount && !reviewerMode) {
      try {
        const response = await fetch("/api/platform/question-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: String(message.questionId), completed: Boolean(message.completed), curriculum: activeCurriculum() }) });
        synced = response.ok;
      } catch { synced = false; }
    }
    event.source.postMessage({
      type: "mrflynnib-progress-result",
      questionId: String(message.questionId),
      completed: Boolean(message.completed),
      ok: true,
      pending: !synced,
    }, window.location.origin);
    return;
  }

  if (message.type === "mrflynnib-whiteboard-load") {
    try {
      let document = await getSavedWhiteboard(String(message.questionId));
      if (platformAccount && !reviewerMode) {
        try {
          const response = await fetch(`/api/platform/whiteboard?questionId=${encodeURIComponent(String(message.questionId))}&curriculum=${encodeURIComponent(activeCurriculum())}`);
          const result = await response.json();
          if (response.ok && result.document) document = result.document;
        } catch {}
      }
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
      let synced = true;
      if (platformAccount && !reviewerMode) {
        try {
          const response = await fetch("/api/platform/whiteboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: String(message.questionId), document: message.document, curriculum: activeCurriculum() }) });
          synced = response.ok;
        } catch { synced = false; }
      }
      event.source.postMessage({
        type: "mrflynnib-whiteboard-save-result",
        questionId: String(message.questionId),
        ok: true,
        pending: !synced,
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
  const navigationLessons = currentCourse.lessons;
  const currentIndex = navigationLessons.findIndex((lesson) => lesson.id === currentLessonId);
  const next = navigationLessons[currentIndex + direction];
  if (!next) return;
  renderLesson(next);
  renderTopicStrip();
  renderLessonList();
  document.getElementById("videoShell").scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleComplete() {
  if (document.getElementById("completeButton").dataset.plusLocked === "true") {
    showPlusPrompt();
    return;
  }
  if (state.completed.includes(currentLessonId)) {
    state.completed = state.completed.filter((id) => id !== currentLessonId);
    showToast("Lesson marked as not complete");
  } else {
    state.completed.push(currentLessonId);
    showToast("Lesson completed");
  }
  saveState();
  void syncLessonProgress(currentCourseId, currentLessonId, state.completed.includes(currentLessonId));
  renderCourse();
}

function renderProgress() {
  const currentDefinition = courseDefinitions.find((definition) => definition.id === currentCourseId);
  document.getElementById("progressCourseGrid").innerHTML = [currentDefinition].filter(Boolean).map((definition) => {
    const course = courses[definition.id];
    const owned = hasCompleteCourseAccess(course);
    const progressLessons = owned ? course.lessons : salesPreviewLessons(course);
    const complete = completedIn(progressLessons);
    const percentage = percentIn(progressLessons);
    const topicRows = course.topics.map((topic) => {
      const topicLessons = owned ? topic.lessons : progressLessons.filter((lesson) => lesson.topic === topic.number);
      const topicComplete = completedIn(topicLessons);
      const topicPercent = percentIn(topicLessons);
      return `<div class="topic-progress-row"><span>Topic ${topic.number}</span><div><i style="width:${topicPercent}%"></i></div><small>${topicComplete}/${topicLessons.length}</small></div>`;
    }).join("");
    return `<article class="progress-course-card accent-${course.accent}">
      <div class="progress-course-head"><span>${course.code}</span><div><strong>${percentage}%</strong><small>complete</small></div></div>
      <h2>${course.name}</h2>
      <p>${complete} of ${progressLessons.length} ${owned ? "lessons" : "free lessons"} completed</p>
      <div class="topic-progress-list">${topicRows}</div>
      <button class="primary-button" type="button" data-course-id="${course.id}">Continue course</button>
    </article>`;
  }).join("");
}

function pastPaperSets() {
  const sets = pastPaperLibrary?.courses?.[currentPastPaperCourse] || [];
  const filtered = currentPastPaperSession === "all"
    ? sets
    : sets.filter((set) => set.session === currentPastPaperSession);
  return [...filtered].sort((first, second) => {
    const firstYear = Number(first.session.match(/\b20\d{2}\b/)?.[0] || 0);
    const secondYear = Number(second.session.match(/\b20\d{2}\b/)?.[0] || 0);
    if (firstYear !== secondYear) return firstYear - secondYear;
    if (currentPastPaperCourse === "IGCSE") {
      const sessionOrder = { January: 0, Summer: 1, November: 2 };
      const firstSession = first.session.replace(/\s*\b20\d{2}\b\s*/, "").trim();
      const secondSession = second.session.replace(/\s*\b20\d{2}\b\s*/, "").trim();
      const sessionDifference = (sessionOrder[firstSession] ?? 99) - (sessionOrder[secondSession] ?? 99);
      if (sessionDifference) return sessionDifference;
      const paperOrder = { "Paper 1H": 0, "Paper 2H": 1, "Paper 1HR": 2, "Paper 2HR": 3 };
      const paperDifference = (paperOrder[first.paper] ?? 99) - (paperOrder[second.paper] ?? 99);
      if (paperDifference) return paperDifference;
    }
    return `${first.session} ${first.paper} ${first.timezone}`.localeCompare(`${second.session} ${second.paper} ${second.timezone}`, undefined, { numeric: true, sensitivity: "base" });
  });
}

function pastPaperSetIsFree(set) {
  if (set.fullPaper) return false;
  return set.session === "Specimen" || set.session === "May 2021";
}

function renderPastPaperTabs() {
  const tabs = document.getElementById("pastPaperCourseTabs");
  const definitions = enrolledCourseDefinitions.filter((definition) => pastPaperLibrary.courses?.[definition.code]);
  tabs.classList.toggle("is-single-course", definitions.length === 1);
  tabs.innerHTML = definitions.map((definition) => {
    const stats = pastPaperLibrary.stats[definition.code];
    const canChooseCourse = reviewerMode || guestMode || isIbTeacherAccount();
    const Tag = canChooseCourse ? "button" : "div";
    const attributes = canChooseCourse
      ? `type="button" data-past-course="${definition.code}" aria-label="View ${escapeHtml(definition.name)} past-paper previews"`
      : `aria-label="Your enrolled course"`;
    return `<${Tag} class="past-paper-course-tab ${definition.code === currentPastPaperCourse ? "is-active" : ""}" ${attributes}>
      <span>${definition.code}</span>
      <strong>${escapeHtml(definition.name)}</strong>
      <small>${stats.papers} papers · ${stats.questions} solutions</small>
    </${Tag}>`;
  }).join("");
}

function renderPastPaperSessionFilter() {
  const select = document.getElementById("pastPaperSessionFilter");
  const sessions = [...new Set((pastPaperLibrary.courses[currentPastPaperCourse] || []).map((set) => set.session))].sort((first, second) => {
    const firstYear = Number(first.match(/\b20\d{2}\b/)?.[0] || 0);
    const secondYear = Number(second.match(/\b20\d{2}\b/)?.[0] || 0);
    if (firstYear !== secondYear) return firstYear - secondYear;
    if (currentPastPaperCourse === "IGCSE") {
      const sessionOrder = { January: 0, Summer: 1, November: 2 };
      const firstName = first.replace(/\s*\b20\d{2}\b\s*/, "").trim();
      const secondName = second.replace(/\s*\b20\d{2}\b\s*/, "").trim();
      return (sessionOrder[firstName] ?? 99) - (sessionOrder[secondName] ?? 99);
    }
    return first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" });
  });
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
          <span><strong>${escapeHtml(meta)}${pastPaperSetIsFree(set) ? '<b class="paper-free-badge">Free</b>' : ""}</strong><em>${set.fullPaper ? "Complete worked video" : `${set.questions.length} worked solution${set.questions.length === 1 ? "" : "s"}`}</em></span>
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
  document.getElementById("pastPaperQuestionCount").textContent = set.fullPaper ? "Complete paper" : `${set.questions.length} solution${set.questions.length === 1 ? "" : "s"}`;
  document.getElementById("pastPaperQuestionPanel").hidden = Boolean(set.fullPaper);
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
  document.getElementById("pastPaperQuestionPosition").textContent = set.fullPaper ? "Full-paper solution" : `Solution ${index + 1} of ${set.questions.length}`;
  document.getElementById("pastPaperQuestionTitle").textContent = question.title;
  document.getElementById("pastPaperQuestionMeta").textContent = [set.session, set.timezone, set.paper, formatDuration(question.seconds)].filter(Boolean).join(" · ");
  document.getElementById("pastPaperBadge").textContent = currentPastPaperCourse;
  const frame = document.getElementById("pastPaperFrame");
  const courseDefinition = courseDefinitions.find((definition) => definition.code === currentPastPaperCourse);
  if (courseDefinition) currentCourseId = courseDefinition.id;
  void loadProtectedVideo(frame, document.getElementById("pastPaperLoading"), question.id, "past-paper");
}

function renderPastPapers() {
  if (!pastPaperLibrary.stats[currentPastPaperCourse]) currentPastPaperCourse = activeCurriculum() === "igcse" ? "IGCSE" : "AA HL";
  const stats = pastPaperLibrary.stats[currentPastPaperCourse];
  const isIgcsePapers = currentPastPaperCourse === "IGCSE";
  document.querySelector("#pastPapersView .past-paper-intro > p:last-child").textContent = isIgcsePapers
    ? "Choose an exam session and open the complete worked video for the paper you need."
    : "Find your exam session, paper and the worked solution for the exact question you need. Specimen papers and every May 2021 paper are free to watch.";
  renderPastPaperTabs();
  renderPastPaperSessionFilter();
  document.getElementById("pastPaperCourseStats").innerHTML = `<strong>${currentPastPaperCourse}</strong><span>${isIgcsePapers ? `${stats.papers} complete paper solution videos` : `${stats.papers} papers with ${stats.questions} verified worked solutions`}</span>`;
  renderPastPaperCatalog();
  renderPastPaperQuestions();
}

document.addEventListener("click", (event) => {
  const plusButton = event.target.closest("[data-plus-upgrade]");
  if (plusButton) {
    event.preventDefault();
    showPlusPrompt();
    return;
  }

  const viewButton = event.target.closest("[data-view]");
  if (viewButton) setView(viewButton.dataset.view);

  const courseButton = event.target.closest("[data-course-id]");
  if (courseButton) openCourse(courseButton.dataset.courseId, courseButton.dataset.lessonId || null);

  const topicButton = event.target.closest("[data-topic]");
  if (topicButton) {
    currentTopic = Number(topicButton.dataset.topic);
    const defaultLesson = defaultLessonForTopic(currentTopic);
    if (defaultLesson) renderLesson(defaultLesson);
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

document.getElementById("myCourseButton").addEventListener("click", () => {
  if (guestMode) {
    setView("courses");
    return;
  }
  openCourse(currentCourseId, currentLessonId);
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
document.getElementById("teacherCourseSelect").addEventListener("change", (event) => {
  openCourse(event.target.value);
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

const helpDialog = document.getElementById("helpDialog");
document.getElementById("helpButton").addEventListener("click", () => helpDialog.showModal());
document.getElementById("closeHelp").addEventListener("click", () => helpDialog.close());
const plusUpgradeDialog = document.getElementById("plusUpgradeDialog");
document.getElementById("closePlusUpgrade").addEventListener("click", () => plusUpgradeDialog.close());
document.getElementById("dismissPlusUpgrade").addEventListener("click", () => plusUpgradeDialog.close());

document.getElementById("signOut").addEventListener("click", async () => {
  await fetch("/api/platform/sign-out", { method: "POST" });
  window.location.assign(signOutDestination);
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

function configureGuestExperience({ curriculumMismatch = false, currentCurriculum = null } = {}) {
  const isIgcse = requestedCurriculum === "igcse" || requestedCourseId === "igcse";
  guestMode = true;
  enrolledCourseIds = isIgcse
    ? ["igcse"]
    : courseDefinitions.filter((definition) => definition.id !== "igcse").map((definition) => definition.id);
  ownedCourseIds = [];
  enrolledCourseDefinitions = courseDefinitions.filter((definition) => enrolledCourseIds.includes(definition.id));
  const preferred = requestedCourseId && enrolledCourseIds.includes(requestedCourseId) ? requestedCourseId : isIgcse ? "igcse" : "aa-hl";
  const accountHref = isIgcse ? "/igcse/account" : "/account";
  const homeHref = isIgcse ? "/igcse" : "/";
  enrolledCourseId = preferred;
  currentCourseId = preferred;
  currentCourse = courses[preferred];
  currentLessonId = salesPreviewLessons(currentCourse)[0]?.id || currentCourse.lessons[0]?.id;
  currentTopic = getCurrentLesson()?.topic || 1;
  currentPastPaperCourse = currentCourse.code;
  signOutDestination = accountHref;

  document.body.classList.add("guest-course-browser");
  document.body.classList.toggle("igcse-learning", isIgcse);
  document.getElementById("myCourseButton").querySelector("span").textContent = isIgcse ? "My course" : "Courses";
  document.getElementById("primaryLearningHomeLink").href = accountHref;
  document.getElementById("primaryLearningHomeLink").querySelector("strong").textContent = curriculumMismatch ? `${currentCurriculum?.toUpperCase() || "Other"} account active` : "Log in";
  document.getElementById("primaryLearningHomeLink").querySelector("small").textContent = curriculumMismatch ? `Switch to ${isIgcse ? "IGCSE" : "IB"}` : "Save your progress";
  document.getElementById("assignmentsLink").hidden = true;
  document.getElementById("brandLearningHomeLink").href = homeHref;
  document.getElementById("topbarLearningHomeLink").href = homeHref;
  document.getElementById("topbarLearningHomeLink").textContent = isIgcse ? "← IGCSE home" : "← Mr Flynn IB";
  document.querySelector(".topbar-context > span:last-of-type").textContent = "Course preview";
  document.getElementById("accessLink").textContent = isIgcse ? "Create free account" : requestedView === "courses" ? "Explore Plus" : "Unlock with Plus";
  document.getElementById("accessLink").href = isIgcse ? "/igcse/account?mode=sign-up" : requestedView === "courses" ? "/plus" : `/plus?course=${encodeURIComponent(currentCourseId)}`;
  document.getElementById("accessLink").classList.toggle("is-plus", !isIgcse);
  accountButton.classList.add("is-guest");
  document.querySelector(".avatar").textContent = "";
  document.getElementById("accountName").textContent = curriculumMismatch ? "Switch account" : "Log in";
  document.getElementById("accountRole").textContent = isIgcse ? "IGCSE Mathematics" : "Save your progress";
  document.getElementById("learningHomeLink").textContent = curriculumMismatch ? `Switch to ${isIgcse ? "IGCSE" : "IB"}` : "Log in";
  document.getElementById("learningHomeLink").href = accountHref;
  document.getElementById("manageAccessLink").textContent = "Create free account";
  document.getElementById("manageAccessLink").href = `${accountHref}?mode=sign-up`;
  document.getElementById("signOut").hidden = !curriculumMismatch;
  document.getElementById("courseBackButton").textContent = isIgcse ? "← IGCSE home" : "← All courses";
  document.getElementById("courseBackButton").href = isIgcse ? "/igcse" : "/learn/index.html?curriculum=ib&view=courses";
  document.getElementById("welcomeEyebrow").textContent = "Course preview";
  document.getElementById("welcomeTitle").textContent = isIgcse ? "Explore the IGCSE Mathematics course" : `Explore the ${currentCourse.code} course`;
  document.getElementById("welcomeCopy").textContent = "See the complete syllabus and try three carefully chosen lessons in every topic for free.";
  document.getElementById("libraryStatusText").textContent = `${salesPreviewLessons(currentCourse).length} complete lessons free`;
  document.getElementById("coursesEyebrow").textContent = isIgcse ? "Edexcel IGCSE Mathematics" : "IB Mathematics courses";
  document.getElementById("coursesTitle").textContent = isIgcse ? "Your IGCSE Mathematics course" : "Choose your course";
  document.getElementById("coursesDescription").textContent = "Explore the complete course structure and try three free lessons in every syllabus topic.";
  document.getElementById("teachableMigrationNote").hidden = isIgcse;
  document.getElementById("sidebarCourseLabel").textContent = isIgcse ? "Edexcel IGCSE Mathematics" : "IB Mathematics courses";
}

async function bootstrapAccount() {
  if (reviewerMode || validPreviewCourseId) return;
  try {
    const curriculumQuery = requestedCurriculum === "igcse" || requestedCourseId === "igcse" ? "?curriculum=igcse" : "?curriculum=ib";
    const response = await fetch(`/api/platform/bootstrap${curriculumQuery}`, { cache: "no-store" });
    if (response.status === 401) {
      configureGuestExperience();
      return;
    }
    if (response.status === 409) {
      const mismatch = await response.json().catch(() => ({}));
      configureGuestExperience({ curriculumMismatch: true, currentCurriculum: mismatch.currentCurriculum });
      showToast(`You are signed in to the separate ${String(mismatch.currentCurriculum || "other").toUpperCase()} area.`);
      return;
    }
    if (!response.ok) throw new Error("Your learning space could not be loaded.");
    platformAccount = await response.json();
    enrolledCourseIds = platformAccount.availableCourseIds.filter((id) => courses[id]);
    ownedCourseIds = platformAccount.ownedCourseIds.filter((id) => courses[id]);
    // The IGCSE route owns one course. Keep it isolated from any IB course
    // preferences or entitlements that may also belong to this login.
    if (platformAccount.curriculum === "igcse" && courses.igcse) {
      enrolledCourseIds = ["igcse"];
      ownedCourseIds = ownedCourseIds.filter((id) => id === "igcse");
    }
    enrolledCourseDefinitions = courseDefinitions.filter((definition) => enrolledCourseIds.includes(definition.id));
    const preferred = requestedCourseId && enrolledCourseIds.includes(requestedCourseId)
      ? requestedCourseId
      : platformAccount.state?.last_course_id && enrolledCourseIds.includes(platformAccount.state.last_course_id)
        ? platformAccount.state.last_course_id
        : platformAccount.preferredCourseId && enrolledCourseIds.includes(platformAccount.preferredCourseId)
          ? platformAccount.preferredCourseId
          : ownedCourseIds[0] || enrolledCourseIds[0];
    enrolledCourseId = preferred;
    currentCourseId = preferred;
    currentCourse = courses[currentCourseId];
    if (!currentCourse) throw new Error("Your course could not be selected.");
    const savedLesson = platformAccount.state?.last_lesson_id || state.lastLesson;
    currentLessonId = currentCourse.lessons.some((lesson) => lesson.id === savedLesson) ? savedLesson : currentCourse.lessons[0]?.id;
    currentTopic = getCurrentLesson()?.topic || 1;
    currentPastPaperCourse = currentCourse.code;
    const serverCompleted = (platformAccount.progress || []).filter((row) => row.completed).map((row) => row.lesson_id);
    state.completed = [...new Set([...state.completed, ...serverCompleted])];
    state.lastCourse = currentCourseId;
    state.lastLesson = currentLessonId;
    saveState();
    document.querySelector(".avatar").textContent = platformAccount.user.initials;
    accountButton.classList.remove("is-guest");
    document.getElementById("accountName").textContent = platformAccount.user.displayName;
    document.getElementById("accountRole").textContent = `${platformAccount.user.role === "admin" ? "Administrator" : platformAccount.user.role === "teacher" ? "Teacher" : "Student"} account`;
    document.getElementById("accessLink").textContent = platformAccount.access?.label || "Free account";
    document.getElementById("accessLink").classList.toggle("is-plus", Boolean(platformAccount.access?.label?.includes("Plus")));
    document.getElementById("accessLink").href = platformAccount.links.access;
    document.getElementById("manageAccessLink").href = platformAccount.links.access;
    document.getElementById("learningHomeLink").href = platformAccount.links.account;
    document.getElementById("primaryLearningHomeLink").href = platformAccount.links.account;
    document.getElementById("topbarLearningHomeLink").href = platformAccount.links.account;
    document.getElementById("brandLearningHomeLink").href = platformAccount.links.account;
    syncQuestionBankLink();
    document.getElementById("assignmentsLink").href = platformAccount.links.assignments;
    configureTeacherCourseSwitcher();
    void flushLessonProgress();
  } catch {
    configureGuestExperience();
    showToast("You can still browse the free course preview.");
  }
}

async function initialize() {
  try {
    await bootstrapAccount();
    const enrolledCourse = courses[enrolledCourseId];
    const visibleLessonCount = guestMode
      ? enrolledCourseDefinitions.reduce((total, definition) => total + courses[definition.id].lessons.length, 0)
      : enrolledCourse.lessons.length;
    document.getElementById("sidebarVideoCount").textContent = visibleLessonCount;
    document.getElementById("summaryVideos").textContent = visibleLessonCount;
    configurePreviewMode();
    configureCurriculumExperience(platformAccount?.curriculum || reviewCurriculum || (enrolledCourseId === "igcse" ? "igcse" : "ib"));
    renderDashboard();
    renderCourseCards();
    renderProgress();
    if (reviewerMode) {
      setView(requestedView === "past-papers" ? "pastPapers" : "dashboard");
    } else if (guestMode && (requestedView === "courses" || requestedView === "past-papers")) {
      setView(requestedView === "past-papers" ? "pastPapers" : "courses");
    } else if (validPreviewCourseId || requestedCourseId) {
      const requestedTopic = Number.isInteger(previewTopic) && previewTopic > 0 ? previewTopic : 1;
      const requestedLesson = !hasCompleteCourseAccess(enrolledCourse)
        ? salesPreviewLessons(enrolledCourse).find((lesson) => lesson.topic === requestedTopic) || salesPreviewLessons(enrolledCourse)[0]
        : enrolledCourse.topics.find((topic) => topic.number === requestedTopic)?.lessons[0];
      openCourse(enrolledCourseId, requestedLesson?.id || currentLessonId);
    } else if (guestMode) {
      setView("courses");
    } else {
      openCourse(enrolledCourseId, currentLessonId);
    }
  } finally {
    document.body.classList.remove("is-booting");
    document.getElementById("learningBoot")?.setAttribute("hidden", "");
  }
}

window.addEventListener("online", () => void flushLessonProgress());
void initialize().catch(() => {
  document.body.classList.remove("is-booting");
  document.getElementById("learningBoot")?.setAttribute("hidden", "");
  showToast("The course area could not be loaded. Please refresh and try again.");
});
