"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { mathematicalSummaryTitle } from "@/lib/assignment-summary-math";

type Course = "AA HL" | "AA SL" | "AI HL" | "AI SL";
type Paper = "Paper 1" | "Paper 2";
type Section = "A" | "B";

type TestQuestion = {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  paper: string;
  section: Section;
  marks: number;
  html: string;
  markSchemeHtml?: string;
};

type NumberedQuestion = TestQuestion & { number: number };

const courseNames: Record<Course, string> = {
  "AA HL": "Mathematics: analysis and approaches, higher level",
  "AA SL": "Mathematics: analysis and approaches, standard level",
  "AI HL": "Mathematics: applications and interpretation, higher level",
  "AI SL": "Mathematics: applications and interpretation, standard level",
};

function draftId(course: Course) {
  return `test-maker-${course}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function SummaryMath({ children }: { children: string }) {
  const text = mathematicalSummaryTitle(children);
  const pieces: React.ReactNode[] = [];
  const pattern = /\\\(([\s\S]*?)\\\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) pieces.push(text.slice(lastIndex, match.index));
    pieces.push(<span className="assignment-summary-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(match[1], { throwOnError: false, strict: false }) }} key={`${match.index}-${match[1]}`} />);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));
  return <>{pieces}</>;
}

function AnswerBox({ marks, compact = false }: { marks: number; compact?: boolean }) {
  const lines = compact ? 4 : Math.max(6, Math.min(12, marks + 3));
  return <div className={`test-answer-box${compact ? " test-answer-box-compact" : ""}`} aria-hidden="true">{Array.from({ length: lines }, (_, index) => <span className="test-answer-line" key={index} />)}</div>;
}

function RenderedMarkScheme({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    renderMathInElement(ref.current, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      strict: false,
    });
  }, [html]);
  return <div className="test-markscheme-content" dangerouslySetInnerHTML={{ __html: html }} ref={ref} />;
}

function needsContinuationPage(question: TestQuestion) {
  const diagramCount = (question.html.match(/<svg\b/gi) || []).length;
  const tableCount = (question.html.match(/<table\b/gi) || []).length;
  const textOnlyLength = question.html.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  return diagramCount > 1 || (diagramCount === 1 && (question.marks >= 7 || textOnlyLength > 900)) || tableCount > 1 || textOnlyLength > 2100;
}

function QuestionMarkup({ question }: { question: NumberedQuestion }) {
  return (
    <article className="test-paper-question">
      <div className="test-paper-question-heading">
        <strong>{question.number}.</strong>
        <span>[Maximum mark: {question.marks}]</span>
      </div>
      <div className="test-question-body" dangerouslySetInnerHTML={{ __html: question.html }} />
    </article>
  );
}

function PageFooter({ label }: { label: string }) {
  return <footer className="test-paper-footer"><span>Mr Flynn IB</span><span>{label}</span></footer>;
}

function SectionAIntro() {
  return <div className="test-exam-opening">
    <p className="test-working-notice">Full marks are not necessarily awarded for a correct answer with no working. Answers must be supported by working and/or explanations. Where an answer is incorrect, some marks may be given for a correct method, provided this is shown by written working. You are therefore advised to show all working.</p>
    <h2>Section A</h2>
    <p>Answer all questions. Answers must be written within the answer boxes provided. Working may be continued below the lines, if necessary.</p>
  </div>;
}

function SectionBIntro() {
  return <div className="test-exam-opening test-section-b-opening"><p>Do not write solutions on this page.</p><h2>Section B</h2><p>Answer all questions in the booklet provided.</p></div>;
}

function SectionAQuestionPages({ question, first, includeAnswerSpace, paperTitle }: { question: NumberedQuestion; first: boolean; includeAnswerSpace: boolean; paperTitle: string }) {
  const continuation = includeAnswerSpace && needsContinuationPage(question);
  return <Fragment>
    <section className="test-page test-question-page">
      {first ? <SectionAIntro /> : null}
      <QuestionMarkup question={question} />
      {includeAnswerSpace ? <AnswerBox compact={continuation} marks={question.marks} /> : null}
      {continuation ? <p className="test-continues">This question continues on the following page.</p> : null}
      <PageFooter label={paperTitle} />
    </section>
    {continuation ? <section className="test-page test-question-page test-continuation-page">
      <p className="test-continuation-heading">(Question {question.number} continued)</p>
      <AnswerBox marks={question.marks} />
      <PageFooter label={paperTitle} />
    </section> : null}
  </Fragment>;
}

function SectionBQuestionPage({ question, first, paperTitle }: { question: NumberedQuestion; first: boolean; paperTitle: string }) {
  return <section className="test-page test-question-page test-section-b-page">
    {first ? <SectionBIntro /> : null}
    <QuestionMarkup question={question} />
    <PageFooter label={paperTitle} />
  </section>;
}

function MarkSchemePage({ question, first, paperTitle }: { question: NumberedQuestion; first: boolean; paperTitle: string }) {
  return <section className="test-page test-markscheme-page">
    {first ? <div className="test-markscheme-title"><h2>Mark scheme</h2><p>For teacher use</p></div> : null}
    <div className="test-paper-question-heading"><strong>{question.number}.</strong><span>[Maximum mark: {question.marks}]</span></div>
    {question.markSchemeHtml ? <RenderedMarkScheme html={question.markSchemeHtml} /> : <p className="test-markscheme-unavailable">No mark scheme is available for this question.</p>}
    <PageFooter label={`${paperTitle} · Mark scheme`} />
  </section>;
}

export function TestMaker() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(640);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(640);
  const [course, setCourse] = useState<Course>("AA HL");
  const [paper, setPaper] = useState<Paper>("Paper 1");
  const [title, setTitle] = useState("Mathematics practice test");
  const [school, setSchool] = useState("");
  const [duration, setDuration] = useState("90");
  const [testDate, setTestDate] = useState("");
  const [includeAnswerSpace, setIncludeAnswerSpace] = useState(true);
  const [includeMarkScheme, setIncludeMarkScheme] = useState(true);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const source = useMemo(() => {
    const query = new URLSearchParams({
      course,
      embedded: "1",
      test: "1",
      draft: draftId(course),
    });
    return `/question-bank/ib-bank.html?${query.toString()}`;
  }, [course]);

  const loadMoreIfNeeded = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || loadingMoreRef.current || !hasMoreRef.current) return;
    const distanceFromViewport = frame.getBoundingClientRect().top + frameHeightRef.current - window.innerHeight;
    if (distanceFromViewport > 1400) return;
    loadingMoreRef.current = true;
    frame.contentWindow?.postMessage({ type: "mrflynnib-question-bank-load-more" }, window.location.origin);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const handleFrameMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.type === "mrflynnib-question-bank-height") {
        const nextHeight = Number(event.data.height);
        if (Number.isFinite(nextHeight)) {
          frameHeightRef.current = Math.max(640, Math.ceil(nextHeight));
          setFrameHeight(frameHeightRef.current);
        }
        hasMoreRef.current = Number(event.data.rendered) < Number(event.data.total);
        loadingMoreRef.current = false;
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(loadMoreIfNeeded);
      }
      if (event.data?.type === "mrflynnib-test-selection" && Array.isArray(event.data.questions)) {
        const next = event.data.questions
          .filter((item: unknown): item is TestQuestion => Boolean(item && typeof item === "object" && "id" in item && "html" in item))
          .slice(0, 50)
          .map((item: TestQuestion) => ({ ...item, section: item.section === "B" ? "B" : "A" }));
        setQuestions(next);
        if (!next.length) setPreviewOpen(false);
      }
    };
    let ticking = false;
    const handleViewportChange = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { loadMoreIfNeeded(); ticking = false; });
    };
    window.addEventListener("message", handleFrameMessage);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("message", handleFrameMessage);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [loadMoreIfNeeded, source]);

  useEffect(() => {
    if (!previewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewOpen]);

  const resetForCourse = (nextCourse: Course) => {
    setPreviewOpen(false);
    setQuestions([]);
    frameHeightRef.current = 640;
    setFrameHeight(640);
    hasMoreRef.current = true;
    setCourse(nextCourse);
  };

  const removeQuestion = (id: string) => {
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-remove", id }, window.location.origin);
  };

  const clearQuestions = () => {
    setPreviewOpen(false);
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-clear" }, window.location.origin);
  };

  const reorder = (id: string, direction: -1 | 1) => {
    const index = questions.findIndex((question) => question.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next);
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-reorder", ids: next.map((question) => question.id) }, window.location.origin);
  };

  const changeSection = (id: string, section: Section) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, section } : question));
  };

  const numberedQuestions = useMemo(() => questions.map((question, index) => ({ ...question, number: index + 1 })), [questions]);
  const sections = useMemo(() => ({
    A: numberedQuestions.filter((question) => question.section === "A"),
    B: numberedQuestions.filter((question) => question.section === "B"),
  }), [numberedQuestions]);
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const calculatorCopy = course.startsWith("AI") || paper === "Paper 2"
    ? "A graphic display calculator is required for this paper."
    : "A calculator is not permitted for this paper.";

  return (
    <>
      <div className="test-builder-ui stack-xl">
        <section className="test-maker-setup stack-lg" aria-labelledby="test-details-heading">
          <div className="teacher-section-heading">
            <div><p className="eyebrow">Test details</p><h2 id="test-details-heading">Set up the paper</h2></div>
            <p className="muted">Choose one course and paper. The test maker applies the correct calculator instruction and arranges questions into Sections A and B.</p>
          </div>
          <div className="test-maker-form form-grid">
            <label className="field"><span>Test title</span><input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field"><span>School or class <small className="muted">(optional)</small></span><input value={school} maxLength={100} placeholder="Year 13 Mathematics" onChange={(event) => setSchool(event.target.value)} /></label>
            <label className="field"><span>Course</span><select value={course} onChange={(event) => resetForCourse(event.target.value as Course)}><option>AA HL</option><option>AA SL</option><option>AI HL</option><option>AI SL</option></select></label>
            <label className="field"><span>Test paper format</span><select value={paper} onChange={(event) => setPaper(event.target.value as Paper)}><option>Paper 1</option><option>Paper 2</option></select><small className="muted">Controls the cover and calculator instruction. It does not restrict which questions you can browse.</small></label>
            <label className="field"><span>Time allowed in minutes</span><input inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>
            <label className="field"><span>Test date <small className="muted">(optional)</small></span><input type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeAnswerSpace} onChange={(event) => setIncludeAnswerSpace(event.target.checked)} /><span><strong>Include Section A answer boxes</strong><small>Each Section A question receives its own bordered writing area, with a continuation page when the question or diagram needs more room.</small></span></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeMarkScheme} onChange={(event) => setIncludeMarkScheme(event.target.checked)} /><span><strong>Include the mark scheme</strong><small>Add a separate teacher mark scheme after the test paper.</small></span></label>
          </div>
        </section>

        <section className="stack-lg" aria-labelledby="test-questions-heading">
          <div className="teacher-section-heading">
            <div><p className="eyebrow">Question bank</p><h2 id="test-questions-heading">Choose questions</h2></div>
            <p className="muted">Use the paper, topic, subtopic, difficulty and section filters below. The full course bank is available, questions are renumbered automatically, and original source details never appear in the test.</p>
          </div>
          <div className="assignment-picker test-question-picker stack">
            <div className="assignment-picker-summary" aria-live="polite">
              <span className="assignment-picker-summary-copy"><strong>{questions.length} {questions.length === 1 ? "question" : "questions"} selected</strong><span>{totalMarks} {totalMarks === 1 ? "mark" : "marks"} in total</span></span>
              <span className="cluster">
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={() => setPreviewOpen(true)}>Preview test</button> : null}
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={clearQuestions}>Remove all</button> : null}
              </span>
            </div>
            <section className="assignment-selection-review" aria-labelledby="selected-test-questions">
              <div className="assignment-selection-heading"><div><p className="eyebrow">Test contents</p><h3 id="selected-test-questions">Selected questions</h3></div><span>{questions.length} of 50</span></div>
              {questions.length ? <ol className="test-selection-list">
                {questions.map((question, index) => <li key={question.id}>
                  <span className="assignment-selection-number">{index + 1}</span>
                  <span className="assignment-selection-copy"><strong><SummaryMath>{question.title}</SummaryMath></strong><span>{[question.topic, question.subtopic].filter(Boolean).join(" · ")}</span><small>{question.marks} {question.marks === 1 ? "mark" : "marks"}</small></span>
                  <label className="test-section-select"><span>Section</span><select aria-label={`Section for ${question.title}`} value={question.section} onChange={(event) => changeSection(question.id, event.target.value as Section)}><option value="A">A</option><option value="B">B</option></select></label>
                  <span className="test-order-buttons"><button type="button" aria-label={`Move ${question.title} up`} disabled={index === 0} onClick={() => reorder(question.id, -1)}>↑</button><button type="button" aria-label={`Move ${question.title} down`} disabled={index === questions.length - 1} onClick={() => reorder(question.id, 1)}>↓</button></span>
                  <button className="test-remove-question" type="button" onClick={() => removeQuestion(question.id)}>Remove</button>
                </li>)}
              </ol> : <div className="assignment-selection-empty"><strong>No questions selected yet</strong><span>Choose questions from the bank below. They will appear here in test order.</span></div>}
            </section>
            <iframe className="assignment-bank-frame" loading="eager" ref={frameRef} scrolling="no" src={source} style={{ height: `${frameHeight}px` }} title={`${course} ${paper} test question selector`} />
          </div>
        </section>

      </div>

      {questions.length && previewOpen ? <div className="test-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="test-preview-heading" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}>
        <div className="test-preview-modal">
          <div className="test-preview-toolbar">
            <div><p className="eyebrow">Print preview</p><h2 id="test-preview-heading">Your test paper</h2><p>Review every page below, then print it or save it as a PDF.</p></div>
            <span className="cluster"><button className="button button-secondary" type="button" onClick={() => setPreviewOpen(false)}>Close preview</button><button className="button" type="button" onClick={() => window.print()}>Print or save as PDF</button></span>
          </div>
          <div className="test-preview-pages">
            <div className="test-print-root" aria-label="Printable test preview">
              <section className="test-page test-cover-page">
                <div className="test-cover-title"><h2>{courseNames[course]}</h2><strong>{paper}</strong><h1>{title || "Mathematics practice test"}</h1>{school ? <span>{school}</span> : null}</div>
                <div className="test-candidate-details">
                  <div className="test-candidate-name"><span>Name</span><i /></div>
                  <div><span>Class</span><i /></div>
                  <div><span>Date</span><i>{testDate ? new Date(`${testDate}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</i></div>
                </div>
                <p className="test-time-allowed">{duration || "90"} minutes</p>
                <section className="test-instructions"><h3>Instructions to candidates</h3><ul><li>Do not open this paper until instructed to do so.</li><li>{calculatorCopy}</li>{sections.A.length ? <li>Section A: answer all questions. Answers must be written within the answer boxes provided.</li> : null}{sections.B.length ? <li>Section B: answer all questions in the booklet provided.</li> : null}<li>Unless otherwise stated in the question, all numerical answers should be given exactly or correct to three significant figures.</li><li>A clean copy of the appropriate mathematics formula booklet is required for this paper.</li><li>The maximum mark for this paper is [{totalMarks} marks].</li></ul></section>
                <PageFooter label="Teacher-created practice paper" />
              </section>

              {sections.A.map((question, index) => <SectionAQuestionPages first={index === 0} includeAnswerSpace={includeAnswerSpace} key={question.id} paperTitle={title || "Mathematics practice test"} question={question} />)}
              {sections.B.map((question, index) => <SectionBQuestionPage first={index === 0} key={question.id} paperTitle={title || "Mathematics practice test"} question={question} />)}
              {includeMarkScheme ? numberedQuestions.map((question, index) => <MarkSchemePage first={index === 0} key={`markscheme-${question.id}`} paperTitle={title || "Mathematics practice test"} question={question} />) : null}
            </div>
          </div>
        </div>
      </div> : null}
    </>
  );
}
