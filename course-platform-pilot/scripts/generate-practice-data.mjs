import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const distDir = path.join(rootDir, "course-platform-pilot/dist");
const bankPath = path.join(rootDir, "public/question-bank/ib-bank.html");
const outputPath = path.join(distDir, "practice-data.js");
const auditPath = path.join(rootDir, "course-platform-pilot/practice-audit.csv");

function loadWindowValue(filePath, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox);
  return sandbox.window[key];
}

function parseSeed(html) {
  const marker = "var SEED = ";
  const markerAt = html.indexOf(marker);
  const start = html.indexOf("[", markerAt);
  if (markerAt < 0 || start < 0) throw new Error("Question-bank SEED was not found");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  throw new Error("Question-bank SEED is incomplete");
}

const library = loadWindowValue(path.join(distDir, "library-data.js"), "MR_FLYNN_LIBRARY");
const seed = parseSeed(fs.readFileSync(bankPath, "utf8"));

const pilotOverrides = {
  "e533a89a-2e12-47b6-a54c-534a461dcb04": ["N09TZ0HL_P1_Q11X1", "M10TZ2HL_P2_Q1"],
  "6c582652-bd66-470e-9511-48be5574a322": ["M12TZ2SL_P2_Q3", "N18TZ0HL_P2_Q1"],
  "e6cca689-8f8c-4d4d-8566-7dff6e20a096": ["A_M22TZ1SL_P2_Q1", "A_SPECSL_P2_Q3"],
  "b3abcb64-544d-4926-bdc3-3861a2725078": ["A_M23TZ1SL_P2_Q2", "A_M24TZ1SL_P2_Q2"],
  "7096456c-bd06-4c4f-9ac3-f2314a2fa334": ["M15TZ1SL_P1_Q3", "M14TZ2HL_P1_Q2"],
  "9f18b254-9055-436f-bbc8-4761ca34d5b7": ["M13TZ2SL_P1_Q3", "N08TZ0HL_P1_Q2"],
  "111f8aa4-20e2-41a1-8665-a1252556f0a0": ["A_M21TZ2HL_P1_Q1", "A_N24TZ0HL_P1_Q3"],
  "cf573eb5-7cdc-4534-a90b-faa307f6e5ff": ["M16TZ2SL_P1_Q3", "N14TZ0SL_P1_Q4"],
  "64faaf0b-493f-4916-bbde-7ef666e2e7b4": ["A_M25TZ3HL_P1_Q1", "A_N25TZ3HL_P1_Q4"],
  "b492d0cc-b491-46aa-ba1e-48cf199ff207": ["M08TZ2HL_P1_Q12X1", "M12TZ1HL_P1_Q1"],
  "f2db55ba-d9f3-48b2-976e-4d6fc8a35031": ["A_N24TZ0HL_P2_Q2", "M19TZ1HL_P1_Q2"],
  "127d3689-f30e-47ea-bbe3-98c8dccf4967": ["M08TZ2SL_P2_Q2", "M10TZ2SL_P2_Q4"],
};

const aaRules = {
  1: [
    [/proof by contradiction/, "Proof by contradiction"],
    [/proof by induction/, "Proof by induction"],
    [/counter example|deductive proof/, "Simple deductive proof"],
    [/counting|factorial|arrangement|combination|permutation|keeping objects/, "Counting principles"],
    [/partial fractions/, "Partial fractions"],
    [/complex|modulus.argument|euler form|de moivre|roots of unity|conjugate/, "Complex numbers"],
    [/system of linear equations/, "System of linear equations"],
    [/binomial/, "Binomial expansion (n ∈ ℤ⁺)"],
    [/arithmetic|sigma notation/, "Arithmetic sequences"],
    [/geometric|infinite geometric/, "Geometric sequences"],
    [/interest|depreciation|inflation/, "Finance"],
    [/exponent|log|number e|change of base/, "Exponents and logarithms"],
    [/roots of a polynomial/, "Polynomial functions"],
  ],
  2: [
    [/gradient|straight line|parallel and perpendicular/, "Coordinate geometry"],
    [/composite functions/, "Composite functions"],
    [/inverse functions/, "Inverse functions"],
    [/rational functions.*quadratic|quadratic in (the )?(denominator|numerator)/, "Rational functions with quadratics"],
    [/rational functions|asymptotes/, "Rational functions"],
    [/modulus|reciprocal transformations|graphs of y/, "Modulus and further transformations"],
    [/even and odd/, "Odd and even functions"],
    [/polynomial|factor and remainder|dividing polynomials|sum and product of roots/, "Polynomial functions"],
    [/quadratic|discriminant|vertex form/, "Quadratics"],
    [/inequalities/, "Inequalities"],
    [/exponential|logarithmic/, "Exponential and logarithmic functions"],
    [/transformations|sketching functions|features of graphs/, "Transformations"],
  ],
  3: [
    [/midpoint|distance between 2 points/, "Coordinate geometry"],
    [/volume and surface area|trigonometry in 3d|elevation and depression/, "3D geometry"],
    [/pythagoras|soh cah toa|sine rule|cosine rule|area of a triangle/, "Triangles"],
    [/bearings/, "Bearings"],
    [/radians|arcs and sectors/, "Arcs and sectors"],
    [/inverse trigonometric/, "Inverse trig functions"],
    [/trig identities|reciprocal trig|compound angle/, "Trig identities"],
    [/solving trig/, "Trig equations"],
    [/exact triangles|unit circle|cast diagram|graphs of sin|sinusoidal/, "Sinusoidal functions"],
    [/vector product|areas using vector product/, "Vectors: planes and cross product"],
    [/plane|cross product/, "Vectors: planes and cross product"],
    [/vector|scalar product|parametric form|angle between two lines|intersecting lines|point and a line/, "Vectors: lines and dot product"],
  ],
  4: [
    [/histogram|cumulative frequency/, "Histograms and cumulative frequency curves"],
    [/box|outliers/, "Box and whisker diagrams and outliers"],
    [/regression|correlation/, "Linear regression"],
    [/venn/, "Venn diagrams"],
    [/tree/, "Tree diagrams"],
    [/binomial distribution/, "Binomial distribution"],
    [/normal distribution/, "Normal distribution"],
    [/continuous random variable|linear transformations of x/, "Continuous random variables"],
    [/discrete random variable/, "Discrete random variables"],
    [/probability|bayes/, "Probability"],
    [/data|sampling|average|spread|frequency table|constant changes|variance|standard deviation/, "Descriptive statistics"],
  ],
  5: [
    [/maclaurin|euler.s identity/, "Maclaurin series"],
    [/differential equation|separation of variables|euler.s method|homogenous|integrating factor/, "Differential equations"],
    [/volume of revolution/, "Volume of revolution"],
    [/integration by parts/, "Integration by parts"],
    [/integration by substitution/, "Integration by substitution"],
    [/implicit differentiation/, "Implicit differentiation"],
    [/related rates/, "Related rates of change"],
    [/inverse chain rule/, "Integration rules"],
    [/l.hopital|first principles|introduction to limits|finding a limit|continuous functions|differentiable functions/, "Limits, L'Hopital and first principles"],
    [/graph.*derivative|sketching derivatives/, "Graphs of derivatives"],
    [/stationary|inflexion|increasing and decreasing/, "Stationary points and points of inflexion"],
    [/tangent|normal/, "Tangents and normals"],
    [/optimization/, "Optimization"],
    [/kinematics/, "Kinematics"],
    [/area under|area between|curve and y.axis/, "Area under the curve"],
    [/integration|integrating|finding f|definite/, "Integration rules"],
    [/differentiat|derivative|chain rule|product rule|quotient rule|higher derivatives/, "Differentiation rules"],
  ],
};

const aiRules = {
  1: [
    [/scientific notation/, "Standard form"],
    [/arithmetic|sigma notation/, "Arithmetic sequences"],
    [/complex|modulus.argument|euler form|operations and geometric/, "Complex numbers"],
    [/geometric|infinite geometric/, "Geometric sequences"],
    [/interest|depreciation|inflation|loan|annuit/, "Finance"],
    [/percentage error/, "Percentage error"],
    [/rounding/, "Rounding and bounds"],
    [/bound/, "Rounding and bounds"],
    [/frequency and phase|adding sinusoidal/, "Frequency and phase"],
    [/eigen/, "Eigenvalues and eigenvectors"],
    [/matri|powers of matrices/, "Matrices and powers of matrices"],
    [/system of linear equations/, "System of linear equations"],
    [/exponent|log|number e|change of base/, "Exponents and logarithms"],
  ],
  2: [
    [/gradient|straight line|parallel and perpendicular|linear modelling/, "Linear modelling"],
    [/composite|inverse functions|functions introduction|evaluating functions|piecewise/, "Functions and inverse functions"],
    [/quadratic/, "Quadratics"],
    [/cubic/, "Cubic modelling"],
    [/direct and inverse/, "Direct and inverse variation"],
    [/log log|scaling with logs/, "Semi-log and log-log graphs"],
    [/logistic/, "Logistic modelling"],
    [/exponential|logarithmic|half life/, "Exponential and logarithmic modelling"],
    [/sinusoidal/, "Sinusoidal modelling"],
    [/transform|sketching functions|features of graphs|asymptotes/, "Transformations"],
  ],
  3: [
    [/midpoint|distance between 2 points|perpendicular bisector/, "Coordinate geometry"],
    [/trigonometry in 3d/, "3D trigonometry"],
    [/volume and surface area/, "Three-dimensional geometry"],
    [/elevation and depression/, "Angles of elevation and depression"],
    [/pythagoras|soh cah toa|sine rule|cosine rule|area of a triangle/, "Sine rule, cosine rule and area of a triangle"],
    [/bearings/, "Bearings"],
    [/arcs and sectors|radians/, "Arcs and sectors"],
    [/voronoi/, "Voronoi diagrams"],
    [/matrix transformation|translations|enlargements|rotations|reflections|determinant of a transformation/, "Matrix transformations"],
    [/trig|exact triangles|unit circle|cast diagram|graphs of sin/, "Trig equations and identities"],
    [/vector equation of a line/, "Vector lines"],
    [/vector.*kinematics|motion with variable velocity/, "Vector kinematics"],
    [/vector product|areas using vector product/, "Vector product and area"],
    [/vector|scalar product|components/, "Vectors"],
    [/graph|adjacency|walks|routes|kruskal|prim|eulerian|postman|hamiltonian|travelling salesman|nearest neighbour|deleted vertex/, "Graph theory"],
  ],
  4: [
    [/histogram|cumulative frequency/, "Histograms and cumulative frequency curves"],
    [/box|outliers/, "Box and whisker diagrams"],
    [/spearman/, "Linear regression – Spearman"],
    [/non linear regression/, "Non-linear regression"],
    [/square residual|coefficient of determination/, "Sum of square residuals and R²"],
    [/regression|correlation/, "Linear regression – Pearson"],
    [/venn/, "Venn diagrams"],
    [/tree/, "Tree diagrams"],
    [/binomial distribution/, "Binomial distribution"],
    [/normal distribution sampling|central limit/, "Central limit theorem"],
    [/normal distribution/, "Normal distribution"],
    [/discrete random variable/, "Discrete random variables"],
    [/chi squared.*goodness/, "Chi-squared test – Goodness of fit"],
    [/chi squared/, "Chi-squared test – Independence"],
    [/confidence interval/, "Confidence intervals"],
    [/poisson distribution/, "Poisson distribution"],
    [/matched pair/, "Matched-pairs t-test"],
    [/two.sample/, "Two-sample t-test"],
    [/z.test|t.test/, "T-test and Z-test"],
    [/population proportion/, "Binomial test"],
    [/mean using poisson/, "Poisson test"],
    [/testing for correlation/, "Correlation test"],
    [/type i|errors/, "Type I and Type II errors"],
    [/markov|transition matr|steady state/, "Markov chains and transition matrices"],
    [/linear transformation|linear combination/, "Transformations and combinations of random variables"],
    [/unbiased/, "Unbiased estimators"],
    [/probability/, "Probability"],
    [/data|sampling|survey|reliability|average|spread|frequency table|constant changes|variance|standard deviation/, "Descriptive statistics"],
  ],
  5: [
    [/phase portrait/, "Phase portraits"],
    [/coupled differential|coupled systems/, "Coupled differential equations"],
    [/second order/, "Second order differential equations"],
    [/slope field/, "Slope fields"],
    [/euler.s method/, "Euler's method"],
    [/differential equation|separation of variables/, "Differential equations"],
    [/volume of revolution/, "Volume of revolution"],
    [/integration by substitution/, "Integration by substitution"],
    [/related rates/, "Related rates of change"],
    [/inverse chain rule/, "Integration rules"],
    [/graph.*derivative|sketching derivatives/, "Graphs of derivatives"],
    [/stationary|inflexion|increasing and decreasing/, "Stationary points and points of inflexion"],
    [/tangent|normal/, "Tangents and normals"],
    [/optimization/, "Optimization"],
    [/kinematics/, "Kinematics"],
    [/trapezoidal/, "Trapezoidal rule"],
    [/area under|area between|curve and y.axis/, "Area under the curve"],
    [/integration|integrating|finding f/, "Integration rules"],
    [/product|quotient|chain rule/, "Differentiation - product, quotient and chain rule"],
    [/differentiat|derivative/, "Differentiation - basic rules"],
  ],
};

const placements = new Map();
for (const [course, lessons] of Object.entries(library.courses)) {
  for (const lesson of lessons) {
    if (!placements.has(lesson.id)) placements.set(lesson.id, { lesson, courses: [] });
    placements.get(lesson.id).courses.push(course);
  }
}

function canonicalCourse(courses) {
  if (courses.includes("AA SL")) return "AA SL";
  if (courses.includes("AI SL")) return "AI SL";
  if (courses.includes("AA HL")) return "AA HL";
  return "AI HL";
}

function ruleFor(lesson, course) {
  const normalized = normalize(lesson.title);
  if (course === "AA SL" && /roots of a polynomial/.test(normalized)) return "Quadratics";
  if (course === "AI SL") {
    if (/roots of a polynomial/.test(normalized)) return "Quadratics";
    if (/t test/.test(normalized)) return "T-test";
    if (/differentiat|derivative|stationary|increasing and decreasing/.test(normalized)) return "Differentiation rules";
  }
  const rules = course.startsWith("AA") ? aaRules : aiRules;
  for (const [pattern, subtopic] of rules[lesson.topic] || []) {
    if (pattern.test(normalized)) return subtopic;
  }
  return null;
}

function banksOf(question) {
  return question.banks || [question.course].filter(Boolean);
}

function topicsOf(question, course) {
  return question.topicsFor?.[course] || question.topics || [];
}

function difficultyOf(question, course) {
  return question.difficulty?.[course] || question.difficulty?.[question.course] || "Medium";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/\\[a-z]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stopWords = new Set(["a", "an", "and", "by", "combined", "example", "examples", "finding", "for", "from", "full", "intro", "introduction", "more", "of", "part", "the", "to", "using", "with"]);

function tokenSet(value) {
  const tokens = normalize(value).split(" ").filter((token) => token.length > 2 && !stopWords.has(token));
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (/^matri/.test(token)) expanded.add("matrix");
    if (/^differen|^deriv/.test(token)) expanded.add("derivative");
    if (/^integr/.test(token)) expanded.add("integral");
    if (/^log|^ln$/.test(token)) expanded.add("logarithm");
    if (/^exponent|^power/.test(token)) expanded.add("exponent");
    if (/^trig|^sin$|^sine$|^cos$|^cosine$|^tan$|^tangent$/.test(token)) expanded.add("trig");
    if (/^geometr/.test(token)) expanded.add("geometric");
    if (/^arithmet/.test(token)) expanded.add("arithmetic");
    if (/^transform/.test(token)) expanded.add("transform");
    if (/^polynom/.test(token)) expanded.add("polynomial");
    if (/^permut|^combin|^arrang|^factorial/.test(token)) expanded.add("counting");
    if (/^probab/.test(token)) expanded.add("probability");
    if (/^regress|^correlat/.test(token)) expanded.add("regression");
  }
  return expanded;
}

function questionText(question) {
  // The curated title is the safest concise description of the assessed skill.
  // Full question bodies contain generic mathematical vocabulary that can make
  // a weak match appear relevant to a fine-grained lesson.
  return question.title || "";
}

function paperNumberOf(question, course) {
  return question.paperNumberFor?.[course] || question.paperNumber || "";
}

function calculatorLabel(question, course) {
  const paper = paperNumberOf(question, course);
  if (!course.startsWith("AA")) return paper;
  if (paper === "Paper 1") return "Paper 1 - non-calculator";
  if (paper === "Paper 2") return "Paper 2 - calculator";
  return paper;
}

function passesLessonSpecificCheck(question, lesson) {
  const lessonTitle = normalize(lesson.title);
  const questionTitle = normalize(question.title);
  if (/z test/.test(lessonTitle)) return /z test/.test(questionTitle);
  if (/t test/.test(lessonTitle)) return /t test/.test(questionTitle);
  if (/inverse chain rule/.test(lessonTitle)) return /reverse chain|inverse chain/.test(questionTitle);
  if (/continuous functions/.test(lessonTitle)) return /continuous/.test(questionTitle);
  if (/linear combination.*normal random variables/.test(lessonTitle)) return /normal/.test(questionTitle);
  return true;
}

const usage = new Map();

function scoreQuestion(question, lesson, course, subtopic, position) {
  const lessonTokens = tokenSet(lesson.title);
  const candidateText = normalize(questionText(question));
  const candidateTokens = tokenSet(candidateText);
  let overlap = 0;
  for (const token of lessonTokens) if (candidateTokens.has(token)) overlap += 1;
  const difficulty = difficultyOf(question, course);
  const difficultyBonus = position === 0
    ? ({ Easy: 12, Medium: 7, Hard: 1 }[difficulty] || 4)
    : ({ Easy: 7, Medium: 10, Hard: 4 }[difficulty] || 6);
  const marks = Number(question.marks) || 0;
  const markBonus = position === 0 ? Math.max(0, 22 - marks * 3) : Math.max(0, 16 - marks * 2);
  const partPenalty = Math.max(0, (question.parts?.length || 0) - 3) * 2;
  const phrase = normalize(lesson.title);
  const phraseBonus = phrase.length > 7 && candidateText.includes(phrase) ? 15 : 0;
  const reusePenalty = (usage.get(question.id) || 0) * 4;
  return overlap * 5 + difficultyBonus + markBonus + phraseBonus - reusePenalty - partPenalty;
}

function relevance(question, lesson) {
  const lessonTokens = tokenSet(lesson.title);
  const candidateTokens = tokenSet(questionText(question));
  let overlap = 0;
  for (const token of lessonTokens) if (candidateTokens.has(token)) overlap += 1;
  return overlap;
}

function candidateQuestions(lesson, course, subtopic) {
  return seed.filter((question) => {
    if (!question.id || !question.markscheme || question.offSyllabus || question.provisional) return false;
    if (!banksOf(question).includes(course)) return false;
    return topicsOf(question, course).some((topic) => topic.sub === subtopic);
  });
}

function pickQuestions(lesson, course, subtopic) {
  const relevant = candidateQuestions(lesson, course, subtopic)
    .filter((question) => relevance(question, lesson) > 0)
    .filter((question) => passesLessonSpecificCheck(question, lesson));
  const short = relevant.filter((question) => Number(question.marks) <= 8);
  const candidates = short.length >= 2 ? short : relevant;
  if (candidates.length < 2) return [];
  const first = [...candidates].sort((a, b) => scoreQuestion(b, lesson, course, subtopic, 0) - scoreQuestion(a, lesson, course, subtopic, 0))[0];
  const second = candidates
    .filter((candidate) => candidate.id !== first.id)
    .sort((a, b) => scoreQuestion(b, lesson, course, subtopic, 1) - scoreQuestion(a, lesson, course, subtopic, 1))[0];
  for (const question of [first, second]) usage.set(question.id, (usage.get(question.id) || 0) + 1);
  return [first.id, second.id];
}

const lessons = {};
const audit = [];

for (const [id, placement] of placements) {
  const course = canonicalCourse(placement.courses);
  const subtopic = ruleFor(placement.lesson, course);
  const questionIds = pilotOverrides[id] || (subtopic ? pickQuestions(placement.lesson, course, subtopic) : []);
  const mapped = questionIds.length === 2;
  if (mapped) {
    lessons[id] = {
      lesson: `${placement.lesson.code} ${placement.lesson.title}`,
      course,
      subtopic,
      questionIds,
    };
  }
  audit.push({
    id,
    courses: placement.courses.join(" + "),
    code: placement.lesson.code,
    title: placement.lesson.title,
    bank: course,
    subtopic: subtopic || "",
    status: mapped ? "mapped" : "needs-review",
    quickCheck: questionIds[0] || "",
    quickTitle: questionIds[0] ? seed.find((question) => question.id === questionIds[0])?.title || "" : "",
    quickMarks: questionIds[0] ? seed.find((question) => question.id === questionIds[0])?.marks || "" : "",
    quickPaper: questionIds[0] ? calculatorLabel(seed.find((question) => question.id === questionIds[0]), course) : "",
    examPractice: questionIds[1] || "",
    examTitle: questionIds[1] ? seed.find((question) => question.id === questionIds[1])?.title || "" : "",
    examMarks: questionIds[1] ? seed.find((question) => question.id === questionIds[1])?.marks || "" : "",
    examPaper: questionIds[1] ? calculatorLabel(seed.find((question) => question.id === questionIds[1]), course) : "",
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  format: "Quick check + Exam practice",
  lessonCount: Object.keys(lessons).length,
  questionCount: Object.keys(lessons).length * 2,
  selectionPolicy: "Short exact bank questions; AA paper and calculator rules are shown on every question",
  lessons,
};

fs.writeFileSync(outputPath, `window.MR_FLYNN_PRACTICE = ${JSON.stringify(payload, null, 2)};\n`);

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const columns = ["id", "courses", "code", "title", "bank", "subtopic", "status", "quickCheck", "quickTitle", "quickMarks", "quickPaper", "examPractice", "examTitle", "examMarks", "examPaper"];
fs.writeFileSync(auditPath, `${columns.join(",")}\n${audit.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`);

const mapped = audit.filter((row) => row.status === "mapped");
const review = audit.filter((row) => row.status !== "mapped");
console.log(`Mapped ${mapped.length} of ${audit.length} unique lesson videos to ${mapped.length * 2} exact question-bank records.`);
console.log(`Left ${review.length} lessons for review rather than forcing a weak match.`);
for (const row of review) console.log(`REVIEW ${row.courses} ${row.code} ${row.title}`);
