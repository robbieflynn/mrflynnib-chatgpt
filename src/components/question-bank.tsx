"use client";

import { useState } from "react";
import katex from "katex";
import questionsJson from "@/data/question-bank.json";

type Topic = { main: string; sub: string };
type MarkschemeGroup = [string, Array<[string, string]>];
type QuestionPart = [string, string, string];

type Question = {
  id: string;
  course: string;
  paperNumber: string;
  paper: string;
  qnum: number;
  section: string;
  marks: number;
  difficulty: string;
  title: string;
  body?: string;
  parts?: QuestionPart[];
  markscheme: MarkschemeGroup[];
  topics: Topic[];
  diagramCaption?: string;
  diagramSvg?: string;
  diagram2Svg?: string;
};

const questions = questionsJson as Question[];
const TOPIC_ORDER = [
  "Number and Algebra",
  "Functions",
  "Geometry and Trigonometry",
  "Statistics and Probability",
  "Calculus",
];
const CURRENT_COURSES = [
  { code: "AA HL", name: "Analysis & Approaches", level: "Higher Level" },
  { code: "AA SL", name: "Analysis & Approaches", level: "Standard Level" },
  { code: "AI HL", name: "Applications & Interpretation", level: "Higher Level" },
  { code: "AI SL", name: "Applications & Interpretation", level: "Standard Level" },
] as const;
type CourseChoice = (typeof CURRENT_COURSES)[number]["code"] | "Legacy HL";
const PAGE_SIZE = 12;

function unique(values: string[], preferredOrder: string[] = []) {
  const valuesSet = new Set(values.filter(Boolean));
  return [
    ...preferredOrder.filter((value) => valuesSet.delete(value)),
    ...Array.from(valuesSet).sort(),
  ];
}

function normaliseText(value: string) {
  return value.replaceAll("&ndash;", "–");
}

function MathText({ children }: { children: string }) {
  const text = normaliseText(children);
  const pieces: React.ReactNode[] = [];
  const delimiters = /\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = delimiters.exec(text)) !== null) {
    if (match.index > lastIndex) pieces.push(text.slice(lastIndex, match.index));
    const displayMode = match[1] !== undefined;
    const expression = match[1] ?? match[2];
    pieces.push(
      <span
        className={displayMode ? "qb-math-display" : "qb-math-inline"}
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(expression, {
            displayMode,
            throwOnError: false,
            strict: false,
          }),
        }}
        key={`${match.index}-${expression}`}
      />,
    );
    lastIndex = delimiters.lastIndex;
  }

  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));
  return <>{pieces}</>;
}

function QuestionCard({ question }: { question: Question }) {
  const difficultyClass = question.difficulty.includes("Hard")
    ? "hard"
    : question.difficulty === "Easy"
      ? "easy"
      : "medium";

  return (
    <article className={`qb-card qb-card-${difficultyClass}`}>
      <div className="qb-card-header">
        <div className="qb-card-heading">
          <div className="qb-source">
            {question.paper} · Question {question.qnum} · Section {question.section}
          </div>
          <h2>{question.title}</h2>
          <div className="qb-topic-line">
            {question.topics.map((topic) => `${topic.main} › ${topic.sub}`).join(" · ")}
          </div>
        </div>
        <div className="qb-card-badges" aria-label="Question details">
          <span className="qb-tag qb-tag-course">{question.course} · {question.paperNumber}</span>
          <span className={`qb-tag qb-tag-${difficultyClass}`}>{question.difficulty}</span>
          <span className="qb-tag qb-tag-marks">{question.marks} marks</span>
        </div>
      </div>

      <div className="qb-question-content">
        {question.body && <p className="qb-question-body"><MathText>{question.body}</MathText></p>}

        {(question.diagramSvg || question.diagram2Svg) && (
          <figure className="qb-diagram">
            <div className="qb-diagram-images">
              {question.diagramSvg && <div dangerouslySetInnerHTML={{ __html: question.diagramSvg }} />}
              {question.diagram2Svg && <div dangerouslySetInnerHTML={{ __html: question.diagram2Svg }} />}
            </div>
            {question.diagramCaption && <figcaption>{question.diagramCaption}</figcaption>}
          </figure>
        )}

        {question.parts && (
          <ol className="qb-parts">
            {question.parts.map(([label, text, marks]) => (
              <li key={`${question.id}-${label}`}>
                <span className="qb-part-label">({label})</span>
                <span><MathText>{text}</MathText></span>
                <span className="qb-part-marks">[{marks} {marks === "1" ? "mark" : "marks"}]</span>
              </li>
            ))}
          </ol>
        )}

        <details className="qb-markscheme">
          <summary>View worked mark scheme</summary>
          <div className="qb-markscheme-content">
            {question.markscheme.map(([label, lines], groupIndex) => (
              <div className="qb-ms-group" key={`${question.id}-ms-${label}-${groupIndex}`}>
                {label && <strong className="qb-ms-label">({label})</strong>}
                <ol>
                  {lines.map(([text, mark], lineIndex) => (
                    <li key={`${question.id}-ms-${groupIndex}-${lineIndex}`}>
                      <span><MathText>{text}</MathText></span>
                      <span className="qb-ms-mark">{mark}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}

export function QuestionBank() {
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState<CourseChoice | "">("");
  const [paperNumber, setPaperNumber] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [paper, setPaper] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const paperNumbers = unique(questions.map((question) => question.paperNumber), ["Paper 1", "Paper 2", "Paper 3"]);
  const papers = unique(questions.map((question) => question.paper));
  const topics = unique(questions.flatMap((question) => question.topics.map((item) => item.main)), TOPIC_ORDER);
  const subtopics = topic
    ? unique(questions.flatMap((question) => question.topics.filter((item) => item.main === topic).map((item) => item.sub)))
    : [];

  const query = search.trim().toLowerCase();
  const filtered = questions.filter((question) => {
    if (course && question.course !== course) return false;
    if (paperNumber && question.paperNumber !== paperNumber) return false;
    if (paper && question.paper !== paper) return false;
    if (topic && !question.topics.some((item) => item.main === topic)) return false;
    if (subtopic && !question.topics.some((item) => item.main === topic && item.sub === subtopic)) return false;
    if (difficulty && !question.difficulty.includes(difficulty)) return false;
    if (!query) return true;

    const searchable = [
      question.title,
      question.body ?? "",
      ...(question.parts?.map((part) => part[1]) ?? []),
      ...question.topics.flatMap((item) => [item.main, item.sub]),
    ].join(" ").toLowerCase();
    return searchable.includes(query);
  });

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function resetFilters() {
    setSearch("");
    setPaperNumber("");
    setTopic("");
    setSubtopic("");
    setDifficulty("");
    setPaper("");
    setVisibleCount(PAGE_SIZE);
  }

  function chooseCourse(value: CourseChoice) {
    setCourse(value);
    resetFilters();
  }

  return (
    <div className="question-bank-app">
      <section className="qb-course-picker" aria-labelledby="qb-course-heading">
        <div className="qb-course-picker-heading">
          <div>
            <span>Step 1</span>
            <h2 id="qb-course-heading">Choose your course</h2>
          </div>
          <p>Start with the IB Mathematics course you are studying.</p>
        </div>
        <div className="qb-course-buttons">
          {CURRENT_COURSES.map((item) => (
            <button
              aria-pressed={course === item.code}
              className={course === item.code ? "qb-course-button is-selected" : "qb-course-button"}
              key={item.code}
              onClick={() => chooseCourse(item.code)}
              type="button"
            >
              <strong>{item.code}</strong>
              <span>{item.name}</span>
              <small>{item.level}</small>
            </button>
          ))}
        </div>
        <div className="qb-legacy-route">
          <span>Studying an older syllabus?</span>
          <button
            aria-pressed={course === "Legacy HL"}
            className={course === "Legacy HL" ? "is-selected" : ""}
            onClick={() => chooseCourse("Legacy HL")}
            type="button"
          >
            Open the Legacy HL archive <strong>53 questions</strong>
          </button>
        </div>
      </section>

      {!course && (
        <div className="qb-course-prompt">
          <span>AA or AI?</span>
          <strong>Select your course above to begin.</strong>
          <p>The question bank will keep each syllabus separate so you only see relevant practice.</p>
        </div>
      )}

      {course && course !== "Legacy HL" && (
        <div className="qb-course-coming">
          <span>{course}</span>
          <strong>The {course} collection is being organised.</strong>
          <p>The questions supplied so far belong to the older HL syllabus, so they are being kept separate instead of being placed in the wrong current course.</p>
          <button className="button button-secondary" onClick={() => chooseCourse("Legacy HL")} type="button">Use the Legacy HL archive</button>
        </div>
      )}

      {course === "Legacy HL" && <>
      <div className="qb-toolbar" aria-label="Question bank filters">
        <div className="qb-search-field">
          <label htmlFor="qb-search">Search questions</label>
          <input
            id="qb-search"
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Try ‘integration’, ‘vectors’ or ‘probability’"
            type="search"
            value={search}
          />
        </div>
        <div className="qb-filter-grid">
          <label>
            <span>Paper</span>
            <select value={paperNumber} onChange={(event) => updateFilter(setPaperNumber, event.target.value)}>
              <option value="">All paper types</option>
              {paperNumbers.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Topic</span>
            <select value={topic} onChange={(event) => { updateFilter(setTopic, event.target.value); setSubtopic(""); }}>
              <option value="">All topics</option>
              {topics.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Subtopic</span>
            <select disabled={!topic} value={subtopic} onChange={(event) => updateFilter(setSubtopic, event.target.value)}>
              <option value="">All subtopics</option>
              {subtopics.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => updateFilter(setDifficulty, event.target.value)}>
              <option value="">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
          <label>
            <span>Exam session</span>
            <select value={paper} onChange={(event) => updateFilter(setPaper, event.target.value)}>
              <option value="">All sessions</option>
              {papers.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="qb-results-bar" aria-live="polite">
        <div><strong>{filtered.length}</strong> {filtered.length === 1 ? "question" : "questions"} found</div>
        {(search || paperNumber || topic || subtopic || difficulty || paper) && (
          <button type="button" onClick={resetFilters}>Clear all filters</button>
        )}
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="qb-results">
            {filtered.slice(0, visibleCount).map((question) => <QuestionCard key={question.id} question={question} />)}
          </div>
          {visibleCount < filtered.length && (
            <div className="qb-load-more">
              <button className="button button-secondary" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more questions
              </button>
              <span>Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</span>
            </div>
          )}
        </>
      ) : (
        <div className="qb-empty-state">
          <strong>No questions match those filters yet.</strong>
          <p>Try removing one filter or searching for a broader topic.</p>
          <button className="button button-secondary" type="button" onClick={resetFilters}>Reset filters</button>
        </div>
      )}
      </>}
    </div>
  );
}
