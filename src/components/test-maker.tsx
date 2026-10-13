"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { mathematicalSummaryTitle } from "@/lib/assignment-summary-math";

type Course = "AA HL" | "AA SL" | "AI HL" | "AI SL";
type SinglePaper = "Paper 1" | "Paper 2";
type Paper = SinglePaper | "Paper 1 and Paper 2";
type Section = "A" | "B";
type PreviewMode = "test" | "mark-scheme" | "analysis";
type PrintTarget = "paper-1" | "paper-2" | "mark-scheme-1" | "mark-scheme-2";

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

function isApplicationsCourse(course: Course) {
  return course.startsWith("AI");
}

function formulaBookletName(course: Course) {
  if (course === "AI SL") return "mathematics: applications and interpretation formula booklet";
  if (course === "AI HL") return "mathematics: applications and interpretation HL formula booklet";
  if (course === "AA SL") return "mathematics: analysis and approaches SL formula booklet";
  return "mathematics: analysis and approaches HL formula booklet";
}

function candidateInstructions(course: Course, paper: SinglePaper, totalMarks: number) {
  const applications = isApplicationsCourse(course);
  const calculator = applications || paper === "Paper 2"
    ? "A graphic display calculator is required for this paper."
    : "You are not permitted access to any calculator for this paper.";
  const responseInstructions = applications
    ? paper === "Paper 1"
      ? ["Answer all questions.", "Answers must be written within the answer boxes provided."]
      : ["Answer all the questions in the answer booklet provided."]
    : [
      "Section A: answer all questions. Answers must be written within the answer boxes provided.",
      "Section B: answer all questions in the answer booklet provided.",
    ];

  return [
    "Do not open this examination paper until instructed to do so.",
    calculator,
    ...responseInstructions,
    "Unless otherwise stated in the question, all numerical answers should be given exactly or correct to three significant figures.",
    `A clean copy of the ${formulaBookletName(course)} is required for this paper.`,
    `The maximum mark for this examination paper is [${totalMarks} marks].`,
  ];
}

function questionPaper(value: string): SinglePaper {
  return /paper\s*2/i.test(value) ? "Paper 2" : "Paper 1";
}

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

function AnswerBox({ marks, compact = false, boxRef }: { marks: number; compact?: boolean; boxRef?: React.Ref<HTMLDivElement> }) {
  const lines = Math.max(6, Math.min(12, marks + 3));
  return <div className={`test-answer-box${compact ? " test-answer-box-compact" : ""}`} aria-hidden="true" ref={boxRef}>{Array.from({ length: lines }, (_, index) => <span className="test-answer-line" key={index} />)}</div>;
}

function decodeMathEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'");
}

function renderMarkSchemeMath(html: string) {
  const render = (expression: string, displayMode: boolean) => katex.renderToString(decodeMathEntities(expression), {
    displayMode,
    throwOnError: false,
    strict: false,
  });

  // Render the stored TeX before it enters the page. This makes the preview
  // and the browser's print snapshot identical, even when Print is clicked
  // immediately after opening the mark scheme.
  return html
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression) => render(expression, true))
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression) => render(expression, false));
}

function RenderedMarkScheme({ html }: { html: string }) {
  const renderedHtml = useMemo(() => renderMarkSchemeMath(html), [html]);
  return <div className="test-markscheme-content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />;
}

function restoreLatexSource(container: HTMLElement) {
  Array.from(container.querySelectorAll<HTMLElement>(".katex")).forEach((math) => {
    if (!math.isConnected) return;
    const annotation = math.querySelector<HTMLElement>('annotation[encoding="application/x-tex"]');
    const source = annotation?.textContent;
    if (!source) return;
    const displayWrapper = math.parentElement?.classList.contains("katex-display") ? math.parentElement : null;
    const replacement = document.createTextNode(displayWrapper ? `\\[${source}\\]` : `\\(${source}\\)`);
    (displayWrapper ?? math).replaceWith(replacement);
  });
}

function RenderedQuestion({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Selected questions arrive from an already-typeset iframe. Restore the
    // original TeX and typeset it in this document so scripts, roots and other
    // mathematical notation use one consistent set of print metrics.
    restoreLatexSource(ref.current);
    renderMathInElement(ref.current, {
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      strict: false,
    });
  }, [html]);
  return <div className="test-question-body" dangerouslySetInnerHTML={{ __html: html }} ref={ref} />;
}

function needsContinuationPage(question: TestQuestion) {
  // KaTeX uses small SVGs to draw roots and stretchy symbols. Counting every
  // SVG treated expressions such as cube roots as full diagrams and wrongly
  // compressed their answer boxes. Only genuine question diagrams count here.
  const diagramCount = (question.html.match(/\bqb-diagram\b/gi) || []).length;
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
      <RenderedQuestion html={question.html} />
    </article>
  );
}

function splitPrintableQuestionHtml(html: string) {
  if (typeof document === "undefined") return [html];

  const root = document.createElement("div");
  root.innerHTML = html;
  const units: string[] = [];

  const splitInnerHtml = (innerHtml: string) => {
    const holder = document.createElement("div");
    holder.innerHTML = innerHtml
      .replace(/(?:<br\s*\/?>(?:\s|&nbsp;)*){2,}/gi, '<span data-test-page-break="true"></span>')
      .replace(/\n\s*\n/g, '<span data-test-page-break="true"></span>');
    const segments: string[] = [];
    let inline = "";
    const flushInline = () => {
      if (!inline.trim()) {
        inline = "";
        return;
      }
      segments.push(inline);
      inline = "";
    };

    Array.from(holder.childNodes).forEach((node) => {
      if (node instanceof HTMLElement && node.dataset.testPageBreak === "true") {
        flushInline();
        return;
      }
      if (node instanceof HTMLElement && node.matches("table, .qb-diagram, ul.qb-subparts, ol.qb-subparts")) {
        flushInline();
        if (node.matches("ul.qb-subparts, ol.qb-subparts")) {
          Array.from(node.children).forEach((child) => {
            segments.push(`<${node.tagName.toLowerCase()} class="${node.className}">${child.outerHTML}</${node.tagName.toLowerCase()}>`);
          });
        } else {
          segments.push(node.outerHTML);
        }
        return;
      }
      inline += node instanceof HTMLElement ? node.outerHTML : node.textContent ?? "";
    });
    flushInline();
    return segments;
  };

  Array.from(root.childNodes).forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      if (node.textContent?.trim()) units.push(`<p>${node.textContent}</p>`);
      return;
    }

    if (node.matches("ul.qb-parts, ol.qb-parts")) {
      Array.from(node.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const label = child.querySelector(":scope > b")?.outerHTML ?? "<b></b>";
        const body = child.querySelector<HTMLElement>(":scope > .qb-part-text");
        if (!body) {
          units.push(`<ul class="qb-parts">${child.outerHTML}</ul>`);
          return;
        }
        const bodyClone = body.cloneNode(true) as HTMLElement;
        const marks = bodyClone.querySelector<HTMLElement>(".qb-marks-tag")?.outerHTML ?? "";
        bodyClone.querySelector(".qb-marks-tag")?.remove();
        const segments = splitInnerHtml(bodyClone.innerHTML);
        if (!segments.length) segments.push("");
        segments.forEach((segment, index) => {
          const segmentLabel = index === 0 ? label : '<b class="test-part-label-placeholder" aria-hidden="true"></b>';
          const segmentMarks = index === segments.length - 1 ? marks : "";
          units.push(`<ul class="qb-parts"><li>${segmentLabel}<div class="qb-part-text">${segment}${segmentMarks}</div></li></ul>`);
        });
      });
      return;
    }

    if (node.matches(".qb-stem, p")) {
      const segments = splitInnerHtml(node.innerHTML);
      if (segments.length > 1) {
        const tag = node.tagName.toLowerCase();
        const className = node.className ? ` class="${node.className}"` : "";
        segments.forEach((segment) => units.push(`<${tag}${className}>${segment}</${tag}>`));
        return;
      }
    }
    units.push(node.outerHTML);
  });

  return units.length ? units : [html];
}

function PageFooter({ label }: { label: string }) {
  return <footer className="test-paper-footer"><span>{label}</span></footer>;
}

function SectionAIntro({ calculatorAllowed = false }: { calculatorAllowed?: boolean }) {
  return <div className="test-exam-opening">
    <p className="test-working-notice">Full marks are not necessarily awarded for a correct answer with no working. Answers must be supported by working and/or explanations. {calculatorAllowed ? "Solutions found from a graphic display calculator should be supported by suitable working. " : ""}Where an answer is incorrect, some marks may be given for a correct method, provided this is shown by written working. You are therefore advised to show all working.</p>
    <h2>Section A</h2>
    <p>Answer all questions. Answers must be written within the answer boxes provided. Working may be continued below the lines, if necessary.</p>
  </div>;
}

function SectionBIntro() {
  return <div className="test-exam-opening test-section-b-opening"><p>Do not write solutions on this page.</p><h2>Section B</h2><p>Answer all questions in the booklet provided.</p></div>;
}

function ApplicationsPaperOneIntro() {
  return <div className="test-exam-opening">
    <p className="test-working-notice">Answers must be written within the answer boxes provided. Full marks are not necessarily awarded for a correct answer with no working. Answers must be supported by working and/or explanations. Solutions found from a graphic display calculator should be supported by suitable working. Where an answer is incorrect, some marks may be given for a correct method, provided this is shown by written working. You are therefore advised to show all working.</p>
  </div>;
}

function ApplicationsPaperTwoIntro() {
  return <div className="test-exam-opening">
    <p className="test-working-notice">Answer all questions in the answer booklet provided. Please start each question on a new page. Full marks are not necessarily awarded for a correct answer with no working. Answers must be supported by working and/or explanations. Solutions found from a graphic display calculator should be supported by suitable working. Where an answer is incorrect, some marks may be given for a correct method, provided this is shown by written working. You are therefore advised to show all working.</p>
  </div>;
}

function SectionAQuestionPages({ question, first, paperTitle, showSectionIntro = true, calculatorAllowed = false }: { question: NumberedQuestion; first: boolean; paperTitle: string; showSectionIntro?: boolean; calculatorAllowed?: boolean }) {
  const pageRef = useRef<HTMLElement>(null);
  const answerBoxRef = useRef<HTMLDivElement>(null);
  const continuationNoticeRef = useRef<HTMLParagraphElement>(null);
  const [moveAnswerBoxToContinuation, setMoveAnswerBoxToContinuation] = useState(false);
  const plannedContinuation = needsContinuationPage(question);
  const continuation = plannedContinuation || moveAnswerBoxToContinuation;

  useEffect(() => {
    if (moveAnswerBoxToContinuation) return;
    const page = pageRef.current;
    const answerBox = answerBoxRef.current;
    if (!page || !answerBox) return;

    let animationFrame = 0;
    const checkFit = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const footer = page.querySelector<HTMLElement>(".test-paper-footer");
        const finalFlowElement = continuationNoticeRef.current ?? answerBox;
        if (!footer || !finalFlowElement) return;
        const safeBottom = footer.getBoundingClientRect().top - 8;
        if (finalFlowElement.getBoundingClientRect().bottom > safeBottom) {
          setMoveAnswerBoxToContinuation(true);
        }
      });
    };

    checkFit();
    const resizeObserver = new ResizeObserver(checkFit);
    resizeObserver.observe(page);
    resizeObserver.observe(answerBox);
    const mutationObserver = new MutationObserver(checkFit);
    mutationObserver.observe(page, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [moveAnswerBoxToContinuation, plannedContinuation, question.html]);

  return <Fragment>
    <section className="test-page test-question-page" ref={pageRef}>
      {first ? showSectionIntro ? <SectionAIntro calculatorAllowed={calculatorAllowed} /> : <ApplicationsPaperOneIntro /> : null}
      <QuestionMarkup question={question} />
      {!moveAnswerBoxToContinuation ? <AnswerBox boxRef={answerBoxRef} compact={continuation} marks={question.marks} /> : null}
      {continuation ? <p className={`test-continues${moveAnswerBoxToContinuation ? " test-continues-without-box" : ""}`} ref={continuationNoticeRef}>This question continues on the following page.</p> : null}
      <PageFooter label={paperTitle} />
    </section>
    {continuation ? <section className="test-page test-question-page test-continuation-page">
      <p className="test-continuation-heading">(Question {question.number} continued)</p>
      <AnswerBox marks={question.marks} />
      <PageFooter label={paperTitle} />
    </section> : null}
  </Fragment>;
}

function SectionBQuestionPage({ question, first, paperTitle, showSectionIntro = true }: { question: NumberedQuestion; first: boolean; paperTitle: string; showSectionIntro?: boolean }) {
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const [pages, setPages] = useState<string[][]>([[question.html]]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => setPages([splitPrintableQuestionHtml(question.html)]));
    return () => cancelAnimationFrame(animationFrame);
  }, [question.html]);

  useEffect(() => {
    let animationFrame = 0;
    let secondAnimationFrame = 0;
    const checkFit = () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(secondAnimationFrame);
      animationFrame = requestAnimationFrame(() => {
        secondAnimationFrame = requestAnimationFrame(() => {
          for (let index = 0; index < pages.length; index += 1) {
            const page = pageRefs.current[index];
            const footer = page?.querySelector<HTMLElement>(".test-paper-footer");
            const flowEnd = page?.querySelector<HTMLElement>(".test-page-flow-end");
            if (!page || !footer || !flowEnd) continue;
            const safeBottom = footer.getBoundingClientRect().top - 8;
            if (flowEnd.getBoundingClientRect().bottom <= safeBottom || pages[index].length <= 1) continue;

            setPages((current) => {
              const next = current.map((pageUnits) => [...pageUnits]);
              const moved = next[index].pop();
              if (!moved) return current;
              if (next[index + 1]) next[index + 1].unshift(moved);
              else next.push([moved]);
              return next;
            });
            return;
          }
        });
      });
    };

    checkFit();
    const resizeObserver = new ResizeObserver(checkFit);
    pageRefs.current.forEach((page) => { if (page) resizeObserver.observe(page); });
    const mutationObserver = new MutationObserver(checkFit);
    pageRefs.current.forEach((page) => { if (page) mutationObserver.observe(page, { childList: true, subtree: true, characterData: true }); });
    pageRefs.current.forEach((page) => page?.querySelectorAll("img").forEach((image) => image.addEventListener("load", checkFit, { once: true })));

    return () => {
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(secondAnimationFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pages]);

  return <Fragment>{pages.map((pageUnits, pageIndex) => <section className="test-page test-question-page test-section-b-page" key={`${question.id}-page-${pageIndex}`} ref={(node) => { pageRefs.current[pageIndex] = node; }}>
    {pageIndex === 0 && first ? showSectionIntro ? <SectionBIntro /> : <ApplicationsPaperTwoIntro /> : null}
    {pageIndex > 0 ? <p className="test-continuation-heading">(Question {question.number} continued)</p> : null}
    <article className="test-paper-question">
      {pageIndex === 0 ? <div className="test-paper-question-heading"><strong>{question.number}.</strong><span>[Maximum mark: {question.marks}]</span></div> : null}
      <RenderedQuestion html={pageUnits.join("")} />
    </article>
    <span className="test-page-flow-end" aria-hidden="true" />
    <PageFooter label={paperTitle} />
  </section>)}</Fragment>;
}

function MarkSchemePage({ question, first, paperTitle }: { question: NumberedQuestion; first: boolean; paperTitle: string }) {
  return <section className="test-page test-markscheme-page">
    {first ? <div className="test-markscheme-title"><h2>Mark scheme</h2><p>For teacher use</p></div> : null}
    <div className="test-paper-question-heading"><strong>{question.number}.</strong><span>[Maximum mark: {question.marks}]</span></div>
    {question.markSchemeHtml ? <RenderedMarkScheme html={question.markSchemeHtml} /> : <p className="test-markscheme-unavailable">No mark scheme is available for this question.</p>}
    <PageFooter label={`${paperTitle} · Mark scheme`} />
  </section>;
}

function PaperPreviewPages({ course, duration, paper, paperTitle, questions, school, testDate }: { course: Course; duration: string; paper: SinglePaper; paperTitle: string; questions: NumberedQuestion[]; school: string; testDate: string }) {
  const applicationsCourse = isApplicationsCourse(course);
  const sections = {
    A: questions.filter((question) => question.section === "A"),
    B: questions.filter((question) => question.section === "B"),
  };
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const instructions = candidateInstructions(course, paper, totalMarks);
  const paperClass = paper === "Paper 1" ? "paper-1" : "paper-2";

  return <div className={`test-paper-set test-paper-set-${paperClass}`}>
    <section className="test-page test-cover-page">
      <div className="test-cover-title"><h2>{courseNames[course]}</h2><strong>{paper}</strong><h1>{paperTitle}</h1>{school ? <span>{school}</span> : null}</div>
      <div className="test-candidate-details">
        <div className="test-candidate-name"><span>Name</span><i /></div>
        <div><span>Teacher</span><i /></div>
        <div><span>Date</span><i>{testDate ? new Date(`${testDate}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</i></div>
      </div>
      <p className="test-time-allowed">{duration || "90"} minutes</p>
      <section className="test-instructions"><h3>Instructions to candidates</h3><ul>{instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul></section>
      <PageFooter label="Teacher-created practice paper" />
    </section>

    {applicationsCourse && paper === "Paper 1" ? questions.map((question, index) => <SectionAQuestionPages first={index === 0} key={question.id} paperTitle={paperTitle} question={question} showSectionIntro={false} />) : null}
    {applicationsCourse && paper === "Paper 2" ? questions.map((question, index) => <SectionBQuestionPage first={index === 0} key={question.id} paperTitle={paperTitle} question={question} showSectionIntro={false} />) : null}
    {!applicationsCourse ? sections.A.map((question, index) => <SectionAQuestionPages calculatorAllowed={paper === "Paper 2"} first={index === 0} key={question.id} paperTitle={paperTitle} question={question} />) : null}
    {!applicationsCourse ? sections.B.map((question, index) => <SectionBQuestionPage first={index === 0} key={question.id} paperTitle={paperTitle} question={question} />) : null}
  </div>;
}

function MarkSchemePreviewPages({ paper, paperTitle, questions }: { paper: SinglePaper; paperTitle: string; questions: NumberedQuestion[] }) {
  const paperClass = paper === "Paper 1" ? "paper-1" : "paper-2";
  return <div className={`test-markscheme-set test-markscheme-set-${paperClass}`}>
    {questions.map((question, index) => <MarkSchemePage first={index === 0} key={`markscheme-${paperClass}-${question.id}`} paperTitle={`${paperTitle} · ${paper}`} question={question} />)}
  </div>;
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
  const [durationPaper1, setDurationPaper1] = useState("90");
  const [durationPaper2, setDurationPaper2] = useState("90");
  const [testDate, setTestDate] = useState("");
  const [includeMarkScheme, setIncludeMarkScheme] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [printTarget, setPrintTarget] = useState<PrintTarget>("paper-1");
  const [analysisDownloading, setAnalysisDownloading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const combinedPapers = paper === "Paper 1 and Paper 2";
  const displayQuestions = useMemo(() => combinedPapers
    ? [...questions.filter((question) => questionPaper(question.paper) === "Paper 1"), ...questions.filter((question) => questionPaper(question.paper) === "Paper 2")]
    : questions, [combinedPapers, questions]);
  const numberedQuestions = useMemo(() => {
    if (!combinedPapers) return questions.map((question, index) => ({ ...question, number: index + 1 }));
    let paper1Number = 0;
    let paper2Number = 0;
    return displayQuestions.map((question) => ({
      ...question,
      number: questionPaper(question.paper) === "Paper 1" ? ++paper1Number : ++paper2Number,
    }));
  }, [combinedPapers, displayQuestions, questions]);
  const paper1Questions = useMemo(() => numberedQuestions.filter((question) => !combinedPapers || questionPaper(question.paper) === "Paper 1"), [combinedPapers, numberedQuestions]);
  const paper2Questions = useMemo(() => combinedPapers ? numberedQuestions.filter((question) => questionPaper(question.paper) === "Paper 2") : numberedQuestions, [combinedPapers, numberedQuestions]);
  const paperSets = useMemo(() => combinedPapers
    ? [
      { paper: "Paper 1" as const, duration: durationPaper1, questions: paper1Questions },
      { paper: "Paper 2" as const, duration: durationPaper2, questions: paper2Questions },
    ]
    : [{ paper: paper as SinglePaper, duration: paper === "Paper 1" ? durationPaper1 : durationPaper2, questions: numberedQuestions }], [combinedPapers, durationPaper1, durationPaper2, numberedQuestions, paper, paper1Questions, paper2Questions]);

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
        if (!next.length) setPreviewMode(null);
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
    if (!previewMode) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewMode(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewMode]);

  useEffect(() => {
    const resetPrintTarget = () => setPrintTarget("paper-1");
    window.addEventListener("afterprint", resetPrintTarget);
    return () => window.removeEventListener("afterprint", resetPrintTarget);
  }, []);

  const printPages = useCallback((target: PrintTarget) => {
    setPrintTarget(target);
    // Give React and the browser one complete paint before opening the native
    // print dialog so the correct set of pages is present in the PDF preview.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  }, []);

  const downloadAnalysisWorkbook = useCallback(async () => {
    if (!numberedQuestions.length || analysisDownloading) return;
    setAnalysisDownloading(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/teacher/test-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Mathematics practice test",
          course,
          paper,
          teacherOrClass: school,
          testDate,
          questions: numberedQuestions.map(({ number, title: questionTitle, topic, subtopic, marks, paper: sourcePaper, section }) => ({
            number,
            title: questionTitle,
            topic,
            subtopic,
            marks,
            paper: sourcePaper,
            section,
          })),
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message || "The analysis workbook could not be prepared.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "ib-mathematics-test-analysis.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "The analysis workbook could not be prepared.");
    } finally {
      setAnalysisDownloading(false);
    }
  }, [analysisDownloading, course, numberedQuestions, paper, school, testDate, title]);

  const resetForCourse = (nextCourse: Course) => {
    setPreviewMode(null);
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
    setPreviewMode(null);
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-clear" }, window.location.origin);
  };

  const reorder = (id: string, direction: -1 | 1) => {
    const ordered = [...displayQuestions];
    const index = ordered.findIndex((question) => question.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    if (combinedPapers && questionPaper(ordered[index].paper) !== questionPaper(ordered[target].paper)) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setQuestions(ordered);
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-reorder", ids: ordered.map((question) => question.id) }, window.location.origin);
  };

  const changeSection = (id: string, section: Section) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, section } : question));
  };

  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const applicationsCourse = isApplicationsCourse(course);
  const setupSummary = combinedPapers
    ? "Paper 1 and Paper 2 are prepared as separate papers. Their marks are combined in one question-level analysis workbook."
    : applicationsCourse
    ? "AI Paper 1 prints answer boxes; AI Paper 2 uses a separate answer booklet. A graphic display calculator is required for both papers."
    : "AA uses Section A answer boxes and Section B booklet answers. Paper 1 is non-calculator; Paper 2 requires a graphic display calculator.";
  const paperHelp = combinedPapers
    ? "Selected questions are grouped using their original Paper 1 or Paper 2 classification."
    : applicationsCourse
    ? "Paper 1 uses answer boxes; Paper 2 uses an answer booklet. You can browse questions from either source paper."
    : "Controls the cover and calculator instruction. It does not restrict which questions you can browse.";
  const questionPickerHelp = combinedPapers
    ? "Choose from the full course bank. Questions are grouped and numbered separately for Paper 1 and Paper 2."
    : applicationsCourse
    ? "Use the paper, topic, subtopic and difficulty filters below. AI response layout is set automatically by Paper 1 or Paper 2."
    : "Use the paper, topic, subtopic, difficulty and section filters below. Questions are renumbered automatically.";

  return (
    <>
      <div className="test-builder-ui stack-xl">
        <section className="test-maker-setup stack-lg" aria-labelledby="test-details-heading">
          <div className="teacher-section-heading">
            <div><p className="eyebrow">Test details</p><h2 id="test-details-heading">Set up the paper</h2></div>
            <p className="muted">{setupSummary}</p>
          </div>
          <div className="test-maker-form form-grid">
            <label className="field"><span>Test title</span><input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field"><span>School or class <small className="muted">(optional)</small></span><input value={school} maxLength={100} placeholder="Year 13 Mathematics" onChange={(event) => setSchool(event.target.value)} /></label>
            <label className="field"><span>Course</span><select value={course} onChange={(event) => resetForCourse(event.target.value as Course)}><option>AA HL</option><option>AA SL</option><option>AI HL</option><option>AI SL</option></select></label>
            <label className="field"><span>Test paper format</span><select value={paper} onChange={(event) => setPaper(event.target.value as Paper)}><option>Paper 1</option><option>Paper 2</option><option>Paper 1 and Paper 2</option></select><small className="muted">{paperHelp}</small></label>
            {combinedPapers ? <>
              <label className="field"><span>Paper 1 time in minutes</span><input inputMode="numeric" value={durationPaper1} onChange={(event) => setDurationPaper1(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>
              <label className="field"><span>Paper 2 time in minutes</span><input inputMode="numeric" value={durationPaper2} onChange={(event) => setDurationPaper2(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>
            </> : <label className="field"><span>Time allowed in minutes</span><input inputMode="numeric" value={paper === "Paper 1" ? durationPaper1 : durationPaper2} onChange={(event) => (paper === "Paper 1" ? setDurationPaper1 : setDurationPaper2)(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>}
            <label className="field"><span>Test date <small className="muted">(optional)</small></span><input type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeMarkScheme} onChange={(event) => setIncludeMarkScheme(event.target.checked)} /><span><strong>Prepare a separate mark scheme</strong><small>Preview the teacher mark scheme and save or print it as its own PDF.</small></span></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeAnalysis} onChange={(event) => setIncludeAnalysis(event.target.checked)} /><span><strong>Prepare question-level analysis</strong><small>Preview and download the editable question-level analysis workbook.</small></span></label>
          </div>
        </section>

        <section className="stack-lg" aria-labelledby="test-questions-heading">
          <div className="teacher-section-heading">
            <div><p className="eyebrow">Question bank</p><h2 id="test-questions-heading">Choose questions</h2></div>
            <p className="muted">{questionPickerHelp} The full course bank remains available and original source details never appear in the test.</p>
          </div>
          <div className="assignment-picker test-question-picker stack">
            <div className="assignment-picker-summary" aria-live="polite">
              <span className="assignment-picker-summary-copy"><strong>{questions.length} {questions.length === 1 ? "question" : "questions"} selected</strong><span>{totalMarks} {totalMarks === 1 ? "mark" : "marks"} in total</span></span>
              <span className="cluster test-maker-preview-buttons">
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={() => setPreviewMode("test")}>Preview test</button> : null}
                {questions.length && includeMarkScheme ? <button className="button button-secondary button-small" type="button" onClick={() => setPreviewMode("mark-scheme")}>Preview mark scheme</button> : null}
                {questions.length && includeAnalysis ? <button className="button button-secondary button-small" type="button" onClick={() => setPreviewMode("analysis")}>Preview question-level analysis</button> : null}
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={clearQuestions}>Remove all</button> : null}
              </span>
            </div>
            <section className="assignment-selection-review" aria-labelledby="selected-test-questions">
              <div className="assignment-selection-heading"><div><p className="eyebrow">Test contents</p><h3 id="selected-test-questions">Selected questions</h3></div><span>{questions.length} of 50</span></div>
              {questions.length ? <ol className={`test-selection-list${applicationsCourse ? " test-selection-list-no-sections" : ""}`}>
                {displayQuestions.map((question, index) => {
                  const numberedQuestion = numberedQuestions.find((candidate) => candidate.id === question.id);
                  const previous = displayQuestions[index - 1];
                  const next = displayQuestions[index + 1];
                  return <li key={question.id}>
                  <span className="assignment-selection-number">{combinedPapers ? `${questionPaper(question.paper) === "Paper 1" ? "P1" : "P2"} ${numberedQuestion?.number ?? index + 1}` : index + 1}</span>
                  <span className="assignment-selection-copy"><strong><SummaryMath>{question.title}</SummaryMath></strong><span>{[combinedPapers ? questionPaper(question.paper) : "", question.topic, question.subtopic].filter(Boolean).join(" · ")}</span><small>{question.marks} {question.marks === 1 ? "mark" : "marks"}</small></span>
                  {!applicationsCourse ? <label className="test-section-select"><span>Section</span><select aria-label={`Section for ${question.title}`} value={question.section} onChange={(event) => changeSection(question.id, event.target.value as Section)}><option value="A">A</option><option value="B">B</option></select></label> : null}
                  <span className="test-order-buttons"><button type="button" aria-label={`Move ${question.title} up`} disabled={!previous || (combinedPapers && questionPaper(previous.paper) !== questionPaper(question.paper))} onClick={() => reorder(question.id, -1)}>↑</button><button type="button" aria-label={`Move ${question.title} down`} disabled={!next || (combinedPapers && questionPaper(next.paper) !== questionPaper(question.paper))} onClick={() => reorder(question.id, 1)}>↓</button></span>
                  <button className="test-remove-question" type="button" onClick={() => removeQuestion(question.id)}>Remove</button>
                </li>;})}
              </ol> : <div className="assignment-selection-empty"><strong>No questions selected yet</strong><span>Choose questions from the bank below. They will appear here in test order.</span></div>}
            </section>
            <iframe className="assignment-bank-frame" loading="eager" ref={frameRef} scrolling="no" src={source} style={{ height: `${frameHeight}px` }} title={`${course} ${paper} test question selector`} />
          </div>
        </section>

      </div>

      {questions.length && previewMode ? <div className="test-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="test-preview-heading" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewMode(null); }}>
        <div className="test-preview-modal">
          <div className="test-preview-toolbar">
            <div><p className="eyebrow">{previewMode === "analysis" ? "Workbook preview" : "Print preview"}</p><h2 id="test-preview-heading">{previewMode === "test" ? "Your test paper" : previewMode === "mark-scheme" ? "Your mark scheme" : "Question-level analysis"}</h2><p>{previewMode === "analysis" ? "Review what the workbook will contain, then download the editable Excel file." : "Review every page below, then print it or save it as a PDF."}</p></div>
            <div className="test-preview-action-panel"><span className="cluster test-preview-actions"><button className="button button-secondary" type="button" onClick={() => setPreviewMode(null)}>Close preview</button>
              {previewMode === "test" ? paperSets.filter((set) => set.questions.length).map((set) => <button className="button" type="button" key={`print-${set.paper}`} onClick={() => printPages(set.paper === "Paper 1" ? "paper-1" : "paper-2")}>Print or save {combinedPapers ? `${set.paper} ` : ""}test PDF</button>) : null}
              {previewMode === "mark-scheme" ? paperSets.filter((set) => set.questions.length).map((set) => <button className="button" type="button" key={`print-mark-${set.paper}`} onClick={() => printPages(set.paper === "Paper 1" ? "mark-scheme-1" : "mark-scheme-2")}>Print or save {combinedPapers ? `${set.paper} ` : ""}mark scheme PDF</button>) : null}
              {previewMode === "analysis" ? <button className="button" type="button" disabled={analysisDownloading} onClick={downloadAnalysisWorkbook}>{analysisDownloading ? "Preparing workbook…" : "Download question-level analysis"}</button> : null}
            </span>{analysisError ? <small className="test-analysis-error" role="alert">{analysisError}</small> : null}</div>
          </div>
          <div className="test-preview-pages">
            {previewMode === "test" ? <div className="test-print-root" data-print-target={printTarget} aria-label="Printable test preview">{paperSets.filter((set) => set.questions.length).map((set) => <PaperPreviewPages course={course} duration={set.duration} key={set.paper} paper={set.paper} paperTitle={title || "Mathematics practice test"} questions={set.questions} school={school} testDate={testDate} />)}</div> : null}
            {previewMode === "mark-scheme" ? <div className="test-print-root" data-print-target={printTarget} aria-label="Printable mark scheme preview">{paperSets.filter((set) => set.questions.length).map((set) => <MarkSchemePreviewPages key={set.paper} paper={set.paper} paperTitle={title || "Mathematics practice test"} questions={set.questions} />)}</div> : null}
            {previewMode === "analysis" ? <section className="test-analysis-preview">
              <div className="test-analysis-preview-heading"><div><p className="eyebrow">One editable workbook</p><h3>{title || "Mathematics practice test"}</h3></div><strong>{totalMarks} marks</strong></div>
              <div className="test-analysis-preview-summary"><div><span>Course</span><strong>{course}</strong></div><div><span>Paper</span><strong>{paper}</strong></div><div><span>Questions</span><strong>{questions.length}</strong></div><div><span>Students</span><strong>100 spaces</strong></div></div>
              <div className="test-analysis-preview-table-wrap"><table><thead><tr><th>Paper</th><th>Question</th><th>Subtopic</th><th>Marks</th></tr></thead><tbody>{numberedQuestions.map((question) => <tr key={`analysis-${question.id}`}><td>{combinedPapers ? questionPaper(question.paper) : paper}</td><td>{question.number}</td><td>{question.subtopic || question.topic}</td><td>{question.marks}</td></tr>)}</tbody></table></div>
              <div className="test-analysis-preview-sheets"><div><strong>Mark entry</strong><span>Enter names and question scores. Totals, percentages and grades calculate automatically.</span></div><div><strong>Class analysis</strong><span>See each paper, question and subtopic with stronger red, orange and green performance bands.</span></div><div><strong>Student feedback</strong><span>Select any student from a dropdown to see their colour-coded question breakdown.</span></div></div>
            </section> : null}
          </div>
        </div>
      </div> : null}
    </>
  );
}
