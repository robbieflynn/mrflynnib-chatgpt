import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "public/question-bank/ib-bank.html");
const outputPath = resolve(root, "src/data/question-bank-progress.json");
const source = await readFile(sourcePath, "utf8");

function parseAssignedJson(marker, closingMarker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Could not find ${marker.trim()} in the question bank.`);
  const valueStart = start + marker.length;
  const end = source.indexOf(closingMarker, valueStart);
  if (end < 0) throw new Error(`Could not find the end of ${marker.trim()}.`);
  return JSON.parse(source.slice(valueStart, end + closingMarker.indexOf(";")).trim());
}

const questions = parseAssignedJson("var SEED = ", "\n];");
const topicStructure = parseAssignedJson("var TOPIC_STRUCTURE = ", ";\n\n  function orderedUnique");
const courses = ["AA HL", "AA SL", "AI HL", "AI SL"];
const topicOrder = [
  "Number and Algebra",
  "Functions",
  "Geometry and Trigonometry",
  "Statistics and Probability",
  "Calculus",
];

const manifest = { sourceQuestionCount: questions.length, courses: {} };

for (const course of courses) {
  const activeQuestions = questions.filter((question) => {
    const banks = question.banks === undefined ? [question.course] : question.banks;
    return !question.offSyllabus && !question.provisional && banks.includes(course);
  });
  const courseQuestionIds = new Set(activeQuestions.map((question) => question.id));
  const topicMap = new Map();

  for (const question of activeQuestions) {
    const topics = question.topicsFor?.[course] ?? question.topics ?? [];
    for (const topic of topics) {
      if (!topic?.main || !topic?.sub) continue;
      if (!topicMap.has(topic.main)) topicMap.set(topic.main, new Map());
      const subtopicMap = topicMap.get(topic.main);
      if (!subtopicMap.has(topic.sub)) subtopicMap.set(topic.sub, new Set());
      subtopicMap.get(topic.sub).add(question.id);
    }
  }

  const topics = topicOrder
    .filter((topic) => topicMap.has(topic))
    .map((topic) => {
      const subtopicMap = topicMap.get(topic);
      const preferredOrder = topicStructure[course]?.[topic] ?? [];
      const subtopicNames = [
        ...preferredOrder.filter((subtopic) => subtopicMap.has(subtopic)),
        ...[...subtopicMap.keys()].filter((subtopic) => !preferredOrder.includes(subtopic)).sort(),
      ];
      const topicQuestionIds = new Set();
      const subtopics = subtopicNames.map((subtopic) => {
        const questionIds = [...subtopicMap.get(subtopic)].sort();
        questionIds.forEach((id) => topicQuestionIds.add(id));
        return { name: subtopic, questionIds };
      });
      return { name: topic, questionIds: [...topicQuestionIds].sort(), subtopics };
    });

  manifest.courses[course] = {
    questionIds: [...courseQuestionIds].sort(),
    topics,
  };
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest)}\n`);
console.log(`Wrote ${outputPath}`);
for (const course of courses) {
  console.log(`${course}: ${manifest.courses[course].questionIds.length} questions`);
}
