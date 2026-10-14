"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { mathematicalSummaryTitle } from "@/lib/assignment-summary-math";
import type { SavedTestPayload, SavedTestRecord } from "@/lib/saved-test";

type IBCourse = "AA HL" | "AA SL" | "AI HL" | "AI SL";
type Course = IBCourse | "IGCSE Higher";
type SinglePaper = "Paper 1" | "Paper 2";
type Paper = SinglePaper | "Paper 1 and Paper 2";
type Section = "A" | "B";
type PreviewMode = "test" | "mark-scheme";
type PreviewVariant = "original" | "shadow";
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
  "IGCSE Higher": "Mathematics, Higher Tier",
};

function isApplicationsCourse(course: Course) {
  return course.startsWith("AI");
}

function isIgcseCourse(course: Course) {
  return course === "IGCSE Higher";
}

function formulaBookletName(course: Course) {
  if (course === "AI SL") return "mathematics: applications and interpretation formula booklet";
  if (course === "AI HL") return "mathematics: applications and interpretation HL formula booklet";
  if (course === "AA SL") return "mathematics: analysis and approaches SL formula booklet";
  return "mathematics: analysis and approaches HL formula booklet";
}

function candidateInstructions(course: Course, paper: SinglePaper, totalMarks: number) {
  if (isIgcseCourse(course)) {
    return [
      "Use black ink or ball-point pen.",
      "Fill in the boxes at the top of this page with your name and teacher.",
      "Answer all questions.",
      "Without sufficient working, correct answers may be awarded no marks.",
      "Answer the questions in the spaces provided. There may be more space than you need.",
      "Calculators may be used.",
      "You must not write anything on the formulae page. Anything you write on the formulae page will gain no credit.",
      `The total mark for this paper is ${totalMarks}.`,
      "The marks for each question are shown in brackets. Use this as a guide as to how much time to spend on each question.",
      "Read each question carefully before you start to answer it.",
      "Check your answers if you have time at the end.",
      "Good luck with your examination.",
    ];
  }
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

function questionCountWords(value: number) {
  const small = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  if (value < 20) return small[value] ?? String(value);
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${small[value % 10]}` : ""}`;
  return String(value);
}

function questionPaper(value: string): SinglePaper {
  return /paper\s*2/i.test(value) ? "Paper 2" : "Paper 1";
}

function orderQuestionsForDisplay(items: TestQuestion[], course: Course, combinedPapers: boolean) {
  const orderSections = (questions: TestQuestion[]) => isApplicationsCourse(course) || isIgcseCourse(course)
    ? questions
    : [...questions.filter((question) => question.section !== "B"), ...questions.filter((question) => question.section === "B")];
  if (!combinedPapers) return orderSections(items);
  return [
    ...orderSections(items.filter((question) => questionPaper(question.paper) === "Paper 1")),
    ...orderSections(items.filter((question) => questionPaper(question.paper) === "Paper 2")),
  ];
}

function numberQuestions(items: TestQuestion[], combinedPapers: boolean): NumberedQuestion[] {
  if (!combinedPapers) return items.map((question, index) => ({ ...question, number: index + 1 }));
  let paper1Number = 0;
  let paper2Number = 0;
  return items.map((question) => ({
    ...question,
    number: questionPaper(question.paper) === "Paper 1" ? ++paper1Number : ++paper2Number,
  }));
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

function FormulaDiagram({ kind }: { kind: "trapezium" | "triangle" | "cone" | "prism" | "cylinder" | "sphere" }) {
  const className = `igcse-formula-diagram igcse-formula-diagram-${kind}`;
  if (kind === "trapezium") return <svg aria-hidden="true" className={className} viewBox="0 0 180 120">
    <path d="M45 88h90l-20-51H65z" />
    <path className="formula-dimension" d="M65 31V18m50 13V18M65 23h50M45 94v14m90-14v14M45 103h90M91 42v41" />
    <path className="formula-right-angle" d="M91 88V78h10" />
    <path className="formula-arrowhead" d="m65 23 8-4v8zm50 0-8-4v8zM45 103l8-4v8zm90 0-8-4v8zM91 42l-4 8h8zm0 41-4-8h8z" />
    <text x="87" y="16">a</text><text x="87" y="118">b</text><text x="98" y="67">h</text>
  </svg>;
  if (kind === "triangle") return <svg aria-hidden="true" className={className} viewBox="0 0 180 120">
    <path d="M28 98 90 22l62 76z" />
    <text x="86" y="17">C</text><text x="14" y="108">A</text><text x="155" y="108">B</text><text x="48" y="58">b</text><text x="130" y="58">a</text><text x="87" y="115">c</text>
  </svg>;
  if (kind === "cone") return <svg aria-hidden="true" className={className} viewBox="0 0 190 150">
    <path d="M42 118 96 22l54 96" />
    <path d="M42 118a54 16 0 0 0 108 0" />
    <path className="formula-hidden" d="M42 118a54 16 0 0 1 108 0" />
    <path className="formula-dimension" d="M31 118 84 24M96 118h53M164 22v96" />
    <path className="formula-arrowhead" d="m31 118 3-9 7 4zm53-94-3 9-7-4zm65 94-9-4v8zm15-96-4 9h8zm0 96-4-9h8z" />
    <circle className="formula-point" cx="96" cy="118" r="2" />
    <text x="48" y="73">l</text><text x="118" y="113">r</text><text x="170" y="74">h</text>
  </svg>;
  if (kind === "prism") return <svg aria-hidden="true" className={className} viewBox="0 0 220 145">
    <path className="formula-cross-section" d="M24 91q34-53 72-35 11 28 5 63-45 2-77-28z" />
    <path d="m96 56 88-20q18 26 11 64l-94 19M24 91l88-21m-11 49 94-19" />
    <path className="formula-hidden" d="m112 70q10 24 7 46" />
    <path className="formula-dimension" d="m105 132 91-22" />
    <path className="formula-arrowhead" d="m105 132 7-7 2 8zm91-22-7 7-2-8z" />
    <text className="formula-label-upright" x="45" y="88">cross</text><text className="formula-label-upright" x="42" y="102">section</text><text className="formula-label-upright" x="142" y="140">length</text>
  </svg>;
  if (kind === "cylinder") return <svg aria-hidden="true" className={className} viewBox="0 0 170 150">
    <ellipse cx="72" cy="32" rx="42" ry="15" />
    <path d="M30 32v82m84-82v82M30 114a42 15 0 0 0 84 0" />
    <path className="formula-hidden" d="M30 114a42 15 0 0 1 84 0" />
    <path className="formula-dimension" d="M72 32h42M132 32v82" />
    <path className="formula-arrowhead" d="m114 32-9-4v8zm18 0-4 9h8zm0 82-4-9h8z" />
    <circle className="formula-point" cx="72" cy="32" r="2" />
    <text x="92" y="27">r</text><text x="140" y="76">h</text>
  </svg>;
  return <svg aria-hidden="true" className={className} viewBox="0 0 170 150">
    <circle cx="82" cy="76" r="55" />
    <path d="M27 76a55 18 0 0 0 110 0" />
    <path className="formula-hidden" d="M27 76a55 18 0 0 1 110 0" />
    <path className="formula-dimension" d="m82 76 39-39" />
    <path className="formula-arrowhead" d="m121 37-9 3 6 6z" />
    <circle className="formula-point" cx="82" cy="76" r="2" />
    <text x="101" y="54">r</text>
  </svg>;
}

function IgcseFormulaSheet({ paperTitle }: { paperTitle: string }) {
  return <section className="test-page igcse-formula-page">
    <div className="igcse-page-frame">
      <header className="igcse-formula-title"><h2>Formulae sheet</h2><p>Higher Tier</p></header>
      <div className="igcse-formula-grid">
        <article><h3>Arithmetic series</h3><p>Sum to <i>n</i> terms, <SummaryMath>{"\\(S_n=\\frac{n}{2}[2a+(n-1)d]\\)"}</SummaryMath></p></article>
        <article><h3>Area of trapezium</h3><p><SummaryMath>{"\\(A=\\frac{1}{2}(a+b)h\\)"}</SummaryMath></p><FormulaDiagram kind="trapezium" /></article>
        <article><h3>The quadratic equation</h3><p>The solutions of <SummaryMath>{"\\(ax^2+bx+c=0\\)"}</SummaryMath>, where <SummaryMath>{"\\(a\\ne0\\)"}</SummaryMath>, are given by:</p><p className="igcse-display-formula"><SummaryMath>{"\\(x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}\\)"}</SummaryMath></p></article>
        <article className="igcse-formula-wide"><h3>Trigonometry <span>In any triangle <i>ABC</i></span></h3><div className="igcse-formula-with-diagram"><FormulaDiagram kind="triangle" /><div><p><strong>Sine Rule</strong> <SummaryMath>{"\\(\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}\\)"}</SummaryMath></p><p><strong>Cosine Rule</strong> <SummaryMath>{"\\(a^2=b^2+c^2-2bc\\cos A\\)"}</SummaryMath></p><p><strong>Area of triangle</strong> <SummaryMath>{"\\(A=\\frac{1}{2}ab\\sin C\\)"}</SummaryMath></p></div></div></article>
        <article><p><strong>Volume of cone</strong> <SummaryMath>{"\\(=\\frac{1}{3}\\pi r^2h\\)"}</SummaryMath></p><p><strong>Curved surface area of cone</strong> <SummaryMath>{"\\(=\\pi rl\\)"}</SummaryMath></p><FormulaDiagram kind="cone" /></article>
        <article><p><strong>Volume of prism</strong><br />= area of cross section × length</p><FormulaDiagram kind="prism" /></article>
        <article><p><strong>Volume of cylinder</strong> <SummaryMath>{"\\(=\\pi r^2h\\)"}</SummaryMath></p><p><strong>Curved surface area of cylinder</strong> <SummaryMath>{"\\(=2\\pi rh\\)"}</SummaryMath></p><FormulaDiagram kind="cylinder" /></article>
        <article><p><strong>Volume of sphere</strong> <SummaryMath>{"\\(=\\frac{4}{3}\\pi r^3\\)"}</SummaryMath></p><p><strong>Surface area of sphere</strong> <SummaryMath>{"\\(=4\\pi r^2\\)"}</SummaryMath></p><FormulaDiagram kind="sphere" /></article>
      </div>
    </div>
    <PageFooter label={paperTitle} />
  </section>;
}

function isCompactIgcseQuestion(question: NumberedQuestion) {
  const textLength = question.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  const diagrams = (question.html.match(/\bqb-diagram\b/gi) || []).length;
  const tables = (question.html.match(/<table\b/gi) || []).length;
  return question.marks <= 4 && textLength < 760 && diagrams === 0 && tables === 0;
}

function igcseQuestionPages(questions: NumberedQuestion[]) {
  const pages: NumberedQuestion[][] = [];
  questions.forEach((question) => {
    const current = pages[pages.length - 1];
    const canShare = current?.length === 1 && isCompactIgcseQuestion(current[0]) && isCompactIgcseQuestion(question) && current[0].marks + question.marks <= 7;
    if (canShare) current.push(question);
    else pages.push([question]);
  });
  return pages;
}

function IgcseQuestionPage({ questions, first, paperTitle, totalQuestions }: { questions: NumberedQuestion[]; first: boolean; paperTitle: string; totalQuestions: number }) {
  return <section className="test-page igcse-question-page">
    <div className="igcse-page-frame">
      {first ? <div className="igcse-paper-opening"><strong>Answer all {questionCountWords(totalQuestions)} questions.</strong><strong>Write your answers in the spaces provided.</strong><strong>You must write down all the stages in your working.</strong></div> : null}
      <div className={`igcse-question-stack${questions.length > 1 ? " has-two-questions" : ""}`}>
        {questions.map((question) => <article className="igcse-print-question" key={question.id}>
          <div className="igcse-question-copy"><strong className="igcse-question-number">{question.number}</strong><RenderedQuestion html={question.html} /></div>
          <div className="igcse-answer-space" style={{ minHeight: `${Math.max(24, Math.min(78, question.marks * 10 + 10))}mm` }} aria-hidden="true"><span /></div>
          <p className="igcse-question-total">(Total for Question {question.number} is {question.marks} {question.marks === 1 ? "mark" : "marks"})</p>
        </article>)}
      </div>
    </div>
    <PageFooter label={paperTitle} />
  </section>;
}

function IgcsePaperPreviewPages({ duration, paper, paperTitle, questions, school, testDate }: { duration: string; paper: SinglePaper; paperTitle: string; questions: NumberedQuestion[]; school: string; testDate: string }) {
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const instructions = candidateInstructions("IGCSE Higher", paper, totalMarks);
  const pages = igcseQuestionPages(questions);
  return <div className={`test-paper-set test-paper-set-${paper === "Paper 1" ? "paper-1" : "paper-2"} igcse-paper-set`}>
    <section className="test-page test-cover-page igcse-cover-page">
      <div className="igcse-cover-panel">
        <h2>Mathematics</h2>
        <strong>{paper}</strong>
        <p>Higher Tier</p>
        <h1>{paperTitle}</h1>
        {school ? <span>{school}</span> : null}
      </div>
      <div className="test-candidate-details igcse-candidate-details">
        <div className="test-candidate-name"><span>Name</span><i /></div>
        <div><span>Teacher</span><i /></div>
        <div><span>Date</span><i>{testDate ? new Date(`${testDate}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}</i></div>
      </div>
      <p className="test-time-allowed">Time: {duration || "120"} minutes</p>
      <section className="igcse-equipment"><strong>You must have:</strong><span>Ruler graduated in centimetres and millimetres, protractor, compasses, pen, HB pencil, eraser and calculator. Tracing paper may be used.</span></section>
      <section className="test-instructions igcse-instructions"><h3>Instructions</h3><ul>{instructions.slice(0, 7).map((instruction) => <li key={instruction}>{instruction}</li>)}</ul><h3>Information</h3><ul>{instructions.slice(7, 9).map((instruction) => <li key={instruction}>{instruction}</li>)}</ul><h3>Advice</h3><ul>{instructions.slice(9).map((instruction) => <li key={instruction}>{instruction}</li>)}</ul></section>
      <PageFooter label="Teacher-created practice paper" />
    </section>
    <IgcseFormulaSheet paperTitle={paperTitle} />
    {pages.map((pageQuestions, index) => <IgcseQuestionPage first={index === 0} key={`igcse-page-${index}`} paperTitle={paperTitle} questions={pageQuestions} totalQuestions={questions.length} />)}
  </div>;
}

export function TestMaker({ initialSavedTests = [], bank = "ib" }: { initialSavedTests?: SavedTestRecord[]; bank?: "ib" | "igcse" }) {
  const igcse = bank === "igcse";
  const defaultCourse: Course = igcse ? "IGCSE Higher" : "AA HL";
  const defaultTitle = igcse ? "IGCSE Mathematics practice test" : "Mathematics practice test";
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(640);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pendingRestoreRef = useRef<SavedTestRecord | null>(null);
  const [frameHeight, setFrameHeight] = useState(640);
  const [course, setCourse] = useState<Course>(defaultCourse);
  const [paper, setPaper] = useState<Paper>("Paper 1");
  const [title, setTitle] = useState(defaultTitle);
  const [school, setSchool] = useState("");
  const [durationPaper1, setDurationPaper1] = useState(igcse ? "120" : "90");
  const [durationPaper2, setDurationPaper2] = useState(igcse ? "120" : "90");
  const [testDate, setTestDate] = useState("");
  const [includeMarkScheme, setIncludeMarkScheme] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [shadowQuestions, setShadowQuestions] = useState<TestQuestion[]>([]);
  const [shadowSourceSignature, setShadowSourceSignature] = useState("");
  const [shadowMessage, setShadowMessage] = useState("");
  const [shadowLoading, setShadowLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [previewVariant, setPreviewVariant] = useState<PreviewVariant>("original");
  const [printTarget, setPrintTarget] = useState<PrintTarget>("paper-1");
  const [analysisDownloading, setAnalysisDownloading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [savedTests, setSavedTests] = useState(initialSavedTests);
  const [activeSavedTestId, setActiveSavedTestId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const combinedPapers = paper === "Paper 1 and Paper 2";
  const usesSections = !igcse && !isApplicationsCourse(course);
  const displayQuestions = useMemo(() => orderQuestionsForDisplay(questions, course, combinedPapers), [combinedPapers, course, questions]);
  const numberedQuestions = useMemo(() => numberQuestions(displayQuestions, combinedPapers), [combinedPapers, displayQuestions]);
  const shadowDisplayQuestions = useMemo(() => orderQuestionsForDisplay(shadowQuestions, course, combinedPapers), [combinedPapers, course, shadowQuestions]);
  const shadowNumberedQuestions = useMemo(() => numberQuestions(shadowDisplayQuestions, combinedPapers), [combinedPapers, shadowDisplayQuestions]);
  const paper1Questions = useMemo(() => numberedQuestions.filter((question) => !combinedPapers || questionPaper(question.paper) === "Paper 1"), [combinedPapers, numberedQuestions]);
  const paper2Questions = useMemo(() => combinedPapers ? numberedQuestions.filter((question) => questionPaper(question.paper) === "Paper 2") : numberedQuestions, [combinedPapers, numberedQuestions]);
  const paperSets = useMemo(() => combinedPapers
    ? [
      { paper: "Paper 1" as const, duration: durationPaper1, questions: paper1Questions },
      { paper: "Paper 2" as const, duration: durationPaper2, questions: paper2Questions },
    ]
    : [{ paper: paper as SinglePaper, duration: paper === "Paper 1" ? durationPaper1 : durationPaper2, questions: numberedQuestions }], [combinedPapers, durationPaper1, durationPaper2, numberedQuestions, paper, paper1Questions, paper2Questions]);
  const shadowPaper1Questions = useMemo(() => shadowNumberedQuestions.filter((question) => !combinedPapers || questionPaper(question.paper) === "Paper 1"), [combinedPapers, shadowNumberedQuestions]);
  const shadowPaper2Questions = useMemo(() => combinedPapers ? shadowNumberedQuestions.filter((question) => questionPaper(question.paper) === "Paper 2") : shadowNumberedQuestions, [combinedPapers, shadowNumberedQuestions]);
  const shadowPaperSets = useMemo(() => combinedPapers
    ? [
      { paper: "Paper 1" as const, duration: durationPaper1, questions: shadowPaper1Questions },
      { paper: "Paper 2" as const, duration: durationPaper2, questions: shadowPaper2Questions },
    ]
    : [{ paper: paper as SinglePaper, duration: paper === "Paper 1" ? durationPaper1 : durationPaper2, questions: shadowNumberedQuestions }], [combinedPapers, durationPaper1, durationPaper2, paper, shadowNumberedQuestions, shadowPaper1Questions, shadowPaper2Questions]);
  const activeNumberedQuestions = previewVariant === "shadow" ? shadowNumberedQuestions : numberedQuestions;
  const activePaperSets = previewVariant === "shadow" ? shadowPaperSets : paperSets;
  const activeTitle = previewVariant === "shadow" ? `${title || defaultTitle} · Shadow paper` : title || defaultTitle;

  const source = useMemo(() => {
    const query = new URLSearchParams({
      course,
      embedded: "1",
      test: "1",
      draft: draftId(course),
      testLabel: igcse ? "IGCSE Test Maker" : "IB Test Maker",
    });
    return `/question-bank/${igcse ? "igcse-bank" : "ib-bank"}.html?${query.toString()}`;
  }, [course, igcse]);

  const sendPendingRestore = useCallback(() => {
    const savedTest = pendingRestoreRef.current;
    if (!savedTest) return;
    frameRef.current?.contentWindow?.postMessage({
      type: "mrflynnib-test-set-selection",
      questions: savedTest.payload.questions,
      shadowQuestions: savedTest.payload.shadowQuestions,
    }, window.location.origin);
  }, []);

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
      if (event.data?.type === "mrflynnib-test-ready") {
        sendPendingRestore();
      }
      if (event.data?.type === "mrflynnib-test-selection" && Array.isArray(event.data.questions)) {
        const pending = pendingRestoreRef.current;
        if (pending) {
          const receivedIds = event.data.questions.map((item: { id?: unknown }) => String(item?.id || ""));
          const expectedIds = pending.payload.questions.map((question) => question.id);
          if (!event.data.restoring && receivedIds.join("|") !== expectedIds.join("|")) return;
        }
        const next: TestQuestion[] = event.data.questions
          .filter((item: unknown): item is TestQuestion => Boolean(item && typeof item === "object" && "id" in item && "html" in item))
          .slice(0, 50)
          .map((item: TestQuestion) => ({ ...item, section: item.section === "B" ? "B" : "A" }));
        const nextSignature = orderQuestionsForDisplay(next, course, combinedPapers).map((question) => `${question.id}:${question.section}`).join("|");
        if (shadowSourceSignature && nextSignature !== shadowSourceSignature) {
          setShadowQuestions([]);
          setShadowSourceSignature("");
          setShadowMessage("The original selection changed, so the previous shadow paper was cleared. Create it again when the test is ready.");
          if (previewVariant === "shadow") {
            setPreviewVariant("original");
            setPreviewMode(null);
          }
        }
        setQuestions(next);
        if (!next.length) setPreviewMode(null);
      }
      if (event.data?.type === "mrflynnib-test-restored") {
        const savedTest = pendingRestoreRef.current;
        const missing = Array.isArray(event.data.missing) ? event.data.missing.length : 0;
        if (!savedTest?.payload.shadowQuestions.length) pendingRestoreRef.current = null;
        if (savedTest) {
          setShadowSourceSignature(savedTest.payload.questions.map((question) => `${question.id}:${question.section}`).join("|"));
          setSaveMessage(missing
            ? `${savedTest.title} opened. ${missing} unavailable ${missing === 1 ? "question was" : "questions were"} left out.`
            : `${savedTest.title} opened and is ready to edit.`);
        }
      }
      if (event.data?.type === "mrflynnib-test-shadow-restored") {
        pendingRestoreRef.current = null;
        const next = Array.isArray(event.data.questions)
          ? event.data.questions
            .filter((item: unknown): item is TestQuestion => Boolean(item && typeof item === "object" && "id" in item && "html" in item))
            .slice(0, 50)
            .map((item: TestQuestion) => ({ ...item, section: item.section === "B" ? "B" : "A" as Section }))
          : [];
        setShadowQuestions(next);
        if (next.length) setShadowMessage(`Saved shadow paper restored with ${next.length} ${next.length === 1 ? "question" : "questions"}.`);
      }
      if (event.data?.type === "mrflynnib-test-shadow") {
        setShadowLoading(false);
        const unmatched = Array.isArray(event.data.unmatched) ? event.data.unmatched : [];
        const next = Array.isArray(event.data.questions)
          ? event.data.questions
            .filter((item: unknown): item is TestQuestion => Boolean(item && typeof item === "object" && "id" in item && "html" in item))
            .slice(0, 50)
            .map((item: TestQuestion) => ({ ...item, section: item.section === "B" ? "B" : "A" as Section }))
          : [];
        if (unmatched.length || next.length !== displayQuestions.length) {
          const names = unmatched.slice(0, 3).map((item: { title?: string }) => item.title || "a selected question").join(", ");
          setShadowQuestions([]);
          setShadowSourceSignature("");
          setShadowMessage(`A complete shadow paper could not be made yet. No equally suitable alternative was found for ${names || "one or more selected questions"}.`);
        } else {
          const fallbackCount = Number(event.data.fallbacks) || 0;
          setShadowQuestions(next);
          setShadowSourceSignature(displayQuestions.map((question) => `${question.id}:${question.section}`).join("|"));
          setShadowMessage(fallbackCount
            ? `Shadow paper ready: all ${next.length} questions were replaced. ${fallbackCount} ${fallbackCount === 1 ? "question uses" : "questions use"} the closest available alternative because no perfect match was available.`
            : `Shadow paper ready: ${next.length} matched ${next.length === 1 ? "question" : "questions"}, with the same paper, section, difficulty and subtopic pattern.`);
        }
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
  }, [combinedPapers, course, displayQuestions, loadMoreIfNeeded, previewVariant, sendPendingRestore, shadowSourceSignature, source]);

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

  const downloadAnalysisWorkbook = useCallback(async (variant: PreviewVariant) => {
    const workbookQuestions = variant === "shadow" ? shadowNumberedQuestions : numberedQuestions;
    const workbookTitle = variant === "shadow" ? `${title || defaultTitle} · Shadow paper` : title || defaultTitle;
    if (!workbookQuestions.length || analysisDownloading) return;
    setAnalysisDownloading(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/teacher/test-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workbookTitle,
          course,
          paper,
          teacherOrClass: school,
          testDate,
          questions: workbookQuestions.map(({ number, title: questionTitle, topic, subtopic, marks, paper: sourcePaper, section }) => ({
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
  }, [analysisDownloading, course, defaultTitle, numberedQuestions, paper, school, shadowNumberedQuestions, testDate, title]);

  const createShadowPaper = () => {
    if (!displayQuestions.length || shadowLoading) return;
    setShadowLoading(true);
    setShadowMessage("Finding a different question for every position…");
    frameRef.current?.contentWindow?.postMessage({
      type: "mrflynnib-test-create-shadow",
      sources: displayQuestions.map((question) => ({ id: question.id, section: question.section })),
    }, window.location.origin);
  };

  const openPreview = (mode: PreviewMode, variant: PreviewVariant = "original") => {
    setPreviewVariant(variant);
    setAnalysisError("");
    setPreviewMode(mode);
  };

  const resetForCourse = (nextCourse: Course) => {
    setPreviewMode(null);
    setQuestions([]);
    setShadowQuestions([]);
    setShadowSourceSignature("");
    setShadowMessage("");
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
    setShadowQuestions([]);
    setShadowSourceSignature("");
    setShadowMessage("");
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-clear" }, window.location.origin);
  };

  const reorder = (id: string, direction: -1 | 1) => {
    const ordered = [...displayQuestions];
    const index = ordered.findIndex((question) => question.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    if (combinedPapers && questionPaper(ordered[index].paper) !== questionPaper(ordered[target].paper)) return;
    if (usesSections && (ordered[index].section === "B") !== (ordered[target].section === "B")) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setQuestions(ordered);
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-test-reorder", ids: ordered.map((question) => question.id) }, window.location.origin);
  };

  const changeSection = (id: string, section: Section) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, section } : question));
    if (shadowQuestions.length) {
      setShadowQuestions([]);
      setShadowSourceSignature("");
      setShadowMessage("The original section choice changed, so the previous shadow paper was cleared. Create it again when the test is ready.");
    }
  };

  const savedPayload = useCallback((): SavedTestPayload => ({
    version: 1,
    school,
    durationPaper1,
    durationPaper2,
    testDate,
    includeMarkScheme,
    includeAnalysis,
    questions: displayQuestions.map((question) => ({ id: question.id, section: question.section })),
    shadowQuestions: shadowDisplayQuestions.map((question) => ({ id: question.id, section: question.section })),
  }), [displayQuestions, durationPaper1, durationPaper2, includeAnalysis, includeMarkScheme, school, shadowDisplayQuestions, testDate]);

  const writeSavedTest = useCallback(async ({ id, savedTitle, savedCourse, savedPaper, questionCount, savedTotalMarks, payload }: {
    id?: string;
    savedTitle: string;
    savedCourse: Course;
    savedPaper: Paper;
    questionCount: number;
    savedTotalMarks: number;
    payload: SavedTestPayload;
  }) => {
    const response = await fetch("/api/teacher/saved-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: savedTitle, course: savedCourse, paper: savedPaper, questionCount, totalMarks: savedTotalMarks, payload }),
    });
    const result = await response.json().catch(() => null) as { test?: SavedTestRecord; message?: string } | null;
    if (!response.ok || !result?.test) throw new Error(result?.message || "The test could not be saved.");
    return result.test;
  }, []);

  const saveCurrentTest = useCallback(async (asNew = false) => {
    if (!displayQuestions.length || saveBusy) return;
    setSaveBusy(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const saved = await writeSavedTest({
        id: asNew ? undefined : activeSavedTestId ?? undefined,
        savedTitle: asNew && activeSavedTestId ? `${title || defaultTitle} copy` : title || defaultTitle,
        savedCourse: course,
        savedPaper: paper,
        questionCount: displayQuestions.length,
        savedTotalMarks: displayQuestions.reduce((total, question) => total + question.marks, 0),
        payload: savedPayload(),
      });
      setSavedTests((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
      setActiveSavedTestId(saved.id);
      if (asNew && activeSavedTestId) setTitle(saved.title);
      setSaveMessage(asNew && activeSavedTestId ? "A new copy has been saved." : activeSavedTestId ? "Your changes have been saved." : "Your test has been saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The test could not be saved.");
    } finally {
      setSaveBusy(false);
    }
  }, [activeSavedTestId, course, defaultTitle, displayQuestions, paper, saveBusy, savedPayload, title, writeSavedTest]);

  const openSavedTest = useCallback((savedTest: SavedTestRecord) => {
    const sameCourse = savedTest.course === course;
    pendingRestoreRef.current = savedTest;
    setActiveSavedTestId(savedTest.id);
    setSaveError("");
    setSaveMessage(`Opening ${savedTest.title}…`);
    setPreviewMode(null);
    setTitle(savedTest.title);
    setSchool(savedTest.payload.school);
    setDurationPaper1(savedTest.payload.durationPaper1);
    setDurationPaper2(savedTest.payload.durationPaper2);
    setTestDate(savedTest.payload.testDate);
    setIncludeMarkScheme(savedTest.payload.includeMarkScheme);
    setIncludeAnalysis(savedTest.payload.includeAnalysis);
    setPaper(savedTest.paper);
    setQuestions([]);
    setShadowQuestions([]);
    setShadowMessage("");
    setShadowSourceSignature("");
    if (!sameCourse) {
      frameHeightRef.current = 640;
      setFrameHeight(640);
      hasMoreRef.current = true;
      setCourse(savedTest.course);
    } else {
      window.requestAnimationFrame(sendPendingRestore);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [course, sendPendingRestore]);

  const duplicateSavedTest = useCallback(async (savedTest: SavedTestRecord) => {
    if (saveBusy) return;
    setSaveBusy(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const copy = await writeSavedTest({
        savedTitle: `${savedTest.title} copy`,
        savedCourse: savedTest.course,
        savedPaper: savedTest.paper,
        questionCount: savedTest.questionCount,
        savedTotalMarks: savedTest.totalMarks,
        payload: savedTest.payload,
      });
      setSavedTests((current) => [copy, ...current]);
      setSaveMessage(`${copy.title} has been saved.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The test could not be duplicated.");
    } finally {
      setSaveBusy(false);
    }
  }, [saveBusy, writeSavedTest]);

  const deleteSavedTest = useCallback(async (savedTest: SavedTestRecord) => {
    if (saveBusy || !window.confirm(`Delete “${savedTest.title}”? This cannot be undone.`)) return;
    setSaveBusy(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const response = await fetch(`/api/teacher/saved-tests?id=${encodeURIComponent(savedTest.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message || "The saved test could not be deleted.");
      setSavedTests((current) => current.filter((item) => item.id !== savedTest.id));
      if (activeSavedTestId === savedTest.id) setActiveSavedTestId(null);
      setSaveMessage(activeSavedTestId === savedTest.id ? "The saved version was deleted. The open test remains available until you leave this page." : "The saved test was deleted.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The saved test could not be deleted.");
    } finally {
      setSaveBusy(false);
    }
  }, [activeSavedTestId, saveBusy]);

  const startNewTest = () => {
    if (questions.length && !window.confirm("Start a new test? Any changes that have not been saved will be lost.")) return;
    pendingRestoreRef.current = null;
    setActiveSavedTestId(null);
    setTitle(defaultTitle);
    setSchool("");
    setDurationPaper1(igcse ? "120" : "90");
    setDurationPaper2(igcse ? "120" : "90");
    setTestDate("");
    setIncludeMarkScheme(true);
    setIncludeAnalysis(true);
    setPaper("Paper 1");
    setSaveError("");
    setSaveMessage("New test started.");
    clearQuestions();
  };

  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const shadowTotalMarks = shadowQuestions.reduce((total, question) => total + question.marks, 0);
  const applicationsCourse = isApplicationsCourse(course);
  const setupSummary = igcse
    ? combinedPapers
      ? "Paper 1 and Paper 2 are prepared as separate calculator papers with the same instructions, formula sheet and question layout."
      : "IGCSE Paper 1 and Paper 2 follow the same calculator-paper format, with a formula sheet and answers written in the spaces provided."
    : combinedPapers
    ? "Paper 1 and Paper 2 are prepared as separate papers. Their marks are combined in one question-level analysis workbook."
    : applicationsCourse
    ? "AI Paper 1 prints answer boxes; AI Paper 2 uses a separate answer booklet. A graphic display calculator is required for both papers."
    : "AA uses Section A answer boxes and Section B booklet answers. Paper 1 is non-calculator; Paper 2 requires a graphic display calculator.";
  const paperHelp = igcse
    ? combinedPapers
      ? "Selected questions are grouped into separate Paper 1 and Paper 2 papers using their source-paper classification."
      : "Both IGCSE papers allow calculators and use the same instructions and question format."
    : combinedPapers
    ? "Selected questions are grouped using their original Paper 1 or Paper 2 classification."
    : applicationsCourse
    ? "Paper 1 uses answer boxes; Paper 2 uses an answer booklet. You can browse questions from either source paper."
    : "Controls the cover and calculator instruction. It does not restrict which questions you can browse.";
  const questionPickerHelp = igcse
    ? combinedPapers
      ? "Choose from the full IGCSE Higher bank. Questions are grouped and numbered separately for Paper 1 and Paper 2."
      : "Use the paper, topic, subtopic and difficulty filters below. There are no Section A or Section B divisions."
    : combinedPapers
    ? "Choose from the full course bank. Questions are grouped and numbered separately for Paper 1 and Paper 2."
    : applicationsCourse
    ? "Use the paper, topic, subtopic and difficulty filters below. AI response layout is set automatically by Paper 1 or Paper 2."
    : "Use the paper, topic, subtopic, difficulty and section filters below. Questions are renumbered automatically.";

  return (
    <>
      <div className="test-builder-ui stack-xl">
        {saveError ? <p className="form-message form-error" role="alert">{saveError}</p> : null}
        {saveMessage ? <p className="form-message form-success" role="status">{saveMessage}</p> : null}
        <section className="saved-test-library stack" aria-labelledby="saved-tests-heading">
          <div className="teacher-section-heading saved-test-library-heading">
            <div><p className="eyebrow">Your library</p><h2 id="saved-tests-heading">Saved tests</h2><p className="muted">Open a test to edit or print it again. Saving keeps it with your teacher account.</p></div>
            <button className="button button-secondary button-small" type="button" onClick={startNewTest}>Start a new test</button>
          </div>
          {savedTests.length ? <div className="saved-test-list">
            {savedTests.map((savedTest) => <article className={`saved-test-row${activeSavedTestId === savedTest.id ? " is-active" : ""}`} key={savedTest.id}>
              <span className="saved-test-copy"><strong>{savedTest.title}</strong><span>{savedTest.course} · {savedTest.paper}</span><small>{savedTest.questionCount} {savedTest.questionCount === 1 ? "question" : "questions"} · {savedTest.totalMarks} marks · Updated {new Date(savedTest.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></span>
              {activeSavedTestId === savedTest.id ? <span className="saved-test-current">Open</span> : null}
              <span className="saved-test-actions"><button className="button button-secondary button-small" disabled={saveBusy} type="button" onClick={() => openSavedTest(savedTest)}>Open</button><button className="button button-secondary button-small" disabled={saveBusy} type="button" onClick={() => duplicateSavedTest(savedTest)}>Duplicate</button><button className="saved-test-delete" disabled={saveBusy} type="button" onClick={() => deleteSavedTest(savedTest)}>Delete</button></span>
            </article>)}
          </div> : <div className="saved-test-empty"><span aria-hidden="true">＋</span><div><strong>No saved tests yet</strong><p>Your first saved paper will appear here, ready to reopen whenever you need it.</p></div></div>}
        </section>
        <section className="test-maker-setup stack-lg" aria-labelledby="test-details-heading">
          <div className="teacher-section-heading">
            <div><p className="eyebrow">Test details</p><h2 id="test-details-heading">{activeSavedTestId ? "Edit the saved paper" : "Set up the paper"}</h2></div>
            <p className="muted">{setupSummary}</p>
          </div>
          <div className="test-maker-form form-grid">
            <label className="field"><span>Test title</span><input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field"><span>School or class <small className="muted">(optional)</small></span><input value={school} maxLength={100} placeholder={igcse ? "Year 11 Mathematics" : "Year 13 Mathematics"} onChange={(event) => setSchool(event.target.value)} /></label>
            {igcse ? <label className="field"><span>Course</span><input readOnly value="IGCSE Mathematics Higher" /></label> : <label className="field"><span>Course</span><select value={course} onChange={(event) => resetForCourse(event.target.value as Course)}><option>AA HL</option><option>AA SL</option><option>AI HL</option><option>AI SL</option></select></label>}
            <label className="field"><span>Test paper format</span><select value={paper} onChange={(event) => setPaper(event.target.value as Paper)}><option>Paper 1</option><option>Paper 2</option><option>Paper 1 and Paper 2</option></select><small className="muted">{paperHelp}</small></label>
            {combinedPapers ? <>
              <label className="field"><span>Paper 1 time in minutes</span><input inputMode="numeric" value={durationPaper1} onChange={(event) => setDurationPaper1(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>
              <label className="field"><span>Paper 2 time in minutes</span><input inputMode="numeric" value={durationPaper2} onChange={(event) => setDurationPaper2(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>
            </> : <label className="field"><span>Time allowed in minutes</span><input inputMode="numeric" value={paper === "Paper 1" ? durationPaper1 : durationPaper2} onChange={(event) => (paper === "Paper 1" ? setDurationPaper1 : setDurationPaper2)(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))} /></label>}
            <label className="field"><span>Test date <small className="muted">(optional)</small></span><input type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeMarkScheme} onChange={(event) => setIncludeMarkScheme(event.target.checked)} /><span><strong>Prepare a separate mark scheme</strong><small>Preview the teacher mark scheme and save or print it as its own PDF.</small></span></label>
            <label className="test-maker-check field-full"><input type="checkbox" checked={includeAnalysis} onChange={(event) => setIncludeAnalysis(event.target.checked)} /><span><strong>Prepare question-level analysis</strong><small>Download the editable question-level analysis workbook with the selected test.</small></span></label>
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
                {questions.length ? <button className="button button-small" disabled={saveBusy} type="button" onClick={() => saveCurrentTest(false)}>{saveBusy ? "Saving…" : activeSavedTestId ? "Save changes" : "Save test"}</button> : null}
                {questions.length && activeSavedTestId ? <button className="button button-secondary button-small" disabled={saveBusy} type="button" onClick={() => saveCurrentTest(true)}>Save as new copy</button> : null}
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={() => openPreview("test")}>Preview test</button> : null}
                {questions.length && includeMarkScheme ? <button className="button button-secondary button-small" type="button" onClick={() => openPreview("mark-scheme")}>Preview mark scheme</button> : null}
                {questions.length && includeAnalysis ? <button className="button button-secondary button-small" disabled={analysisDownloading} type="button" onClick={() => downloadAnalysisWorkbook("original")}>{analysisDownloading ? "Preparing analysis…" : "Download question-level analysis"}</button> : null}
                {questions.length ? <button className="button button-small" disabled={shadowLoading} type="button" onClick={createShadowPaper}>{shadowLoading ? "Matching questions…" : shadowQuestions.length ? "Remake shadow paper" : "Create shadow paper"}</button> : null}
                {questions.length ? <button className="button button-secondary button-small" type="button" onClick={clearQuestions}>Remove all</button> : null}
              </span>
            </div>
            {analysisError ? <p className="form-message form-error" role="alert">{analysisError}</p> : null}
            {shadowMessage ? <p className={shadowQuestions.length ? "form-message form-success" : "form-message"} role="status">{shadowMessage}</p> : null}
            {shadowQuestions.length ? <section className="assignment-selection-review test-shadow-summary" aria-labelledby="shadow-test-heading">
              <div className="assignment-selection-heading"><div><p className="eyebrow">Matched alternative</p><h3 id="shadow-test-heading">Shadow paper</h3><p>Same question count and assessment pattern; every question is different.</p></div><span>{shadowTotalMarks} marks</span></div>
              <div className="cluster test-maker-preview-buttons">
                <button className="button button-secondary button-small" type="button" onClick={() => openPreview("test", "shadow")}>Preview shadow test</button>
                {includeMarkScheme ? <button className="button button-secondary button-small" type="button" onClick={() => openPreview("mark-scheme", "shadow")}>Preview shadow mark scheme</button> : null}
                {includeAnalysis ? <button className="button button-secondary button-small" disabled={analysisDownloading} type="button" onClick={() => downloadAnalysisWorkbook("shadow")}>{analysisDownloading ? "Preparing analysis…" : "Download shadow analysis"}</button> : null}
              </div>
            </section> : null}
            <section className="assignment-selection-review" aria-labelledby="selected-test-questions">
              <div className="assignment-selection-heading"><div><p className="eyebrow">Test contents</p><h3 id="selected-test-questions">Selected questions</h3></div><span>{questions.length} of 50</span></div>
              {questions.length ? <ol className={`test-selection-list${!usesSections ? " test-selection-list-no-sections" : ""}`}>
                {displayQuestions.map((question, index) => {
                  const numberedQuestion = numberedQuestions.find((candidate) => candidate.id === question.id);
                  const previous = displayQuestions[index - 1];
                  const next = displayQuestions[index + 1];
                  return <li key={question.id}>
                  <span className="assignment-selection-number">{combinedPapers ? `${questionPaper(question.paper) === "Paper 1" ? "P1" : "P2"} ${numberedQuestion?.number ?? index + 1}` : index + 1}</span>
                  <span className="assignment-selection-copy"><strong><SummaryMath>{question.title}</SummaryMath></strong><span>{[combinedPapers ? questionPaper(question.paper) : "", question.topic, question.subtopic].filter(Boolean).join(" · ")}</span><small>{question.marks} {question.marks === 1 ? "mark" : "marks"}</small></span>
                  {usesSections ? <label className="test-section-select"><span>Section</span><select aria-label={`Section for ${question.title}`} value={question.section} onChange={(event) => changeSection(question.id, event.target.value as Section)}><option value="A">A</option><option value="B">B</option></select></label> : null}
                  <span className="test-order-buttons"><button type="button" aria-label={`Move ${question.title} up`} disabled={!previous || (combinedPapers && questionPaper(previous.paper) !== questionPaper(question.paper)) || (usesSections && (previous?.section === "B") !== (question.section === "B"))} onClick={() => reorder(question.id, -1)}>↑</button><button type="button" aria-label={`Move ${question.title} down`} disabled={!next || (combinedPapers && questionPaper(next.paper) !== questionPaper(question.paper)) || (usesSections && (next?.section === "B") !== (question.section === "B"))} onClick={() => reorder(question.id, 1)}>↓</button></span>
                  <button className="test-remove-question" type="button" onClick={() => removeQuestion(question.id)}>Remove</button>
                </li>;})}
              </ol> : <div className="assignment-selection-empty"><strong>No questions selected yet</strong><span>Choose questions from the bank below. They will appear here in test order.</span></div>}
            </section>
            <iframe className="assignment-bank-frame" loading="eager" ref={frameRef} scrolling="no" src={source} style={{ height: `${frameHeight}px` }} title={`${course} ${paper} test question selector`} />
          </div>
        </section>

      </div>

      {activeNumberedQuestions.length && previewMode ? <div className="test-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="test-preview-heading" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewMode(null); }}>
        <div className="test-preview-modal">
          <div className="test-preview-toolbar">
            <div><p className="eyebrow">{previewVariant === "shadow" ? "Shadow version" : "Print preview"}</p><h2 id="test-preview-heading">{previewMode === "test" ? (previewVariant === "shadow" ? "Your shadow paper" : "Your test paper") : (previewVariant === "shadow" ? "Your shadow mark scheme" : "Your mark scheme")}</h2><p>Review every page below, then print it or save it as a PDF.</p></div>
            <div className="test-preview-action-panel"><span className="cluster test-preview-actions"><button className="button button-secondary" type="button" onClick={() => setPreviewMode(null)}>Close preview</button>
              {previewMode === "test" ? activePaperSets.filter((set) => set.questions.length).map((set) => <button className="button" type="button" key={`print-${set.paper}`} onClick={() => printPages(set.paper === "Paper 1" ? "paper-1" : "paper-2")}>Print or save {combinedPapers ? `${set.paper} ` : ""}{previewVariant === "shadow" ? "shadow " : ""}test PDF</button>) : null}
              {previewMode === "mark-scheme" ? activePaperSets.filter((set) => set.questions.length).map((set) => <button className="button" type="button" key={`print-mark-${set.paper}`} onClick={() => printPages(set.paper === "Paper 1" ? "mark-scheme-1" : "mark-scheme-2")}>Print or save {combinedPapers ? `${set.paper} ` : ""}{previewVariant === "shadow" ? "shadow " : ""}mark scheme PDF</button>) : null}
            </span></div>
          </div>
          <div className="test-preview-pages">
            {previewMode === "test" ? <div className="test-print-root" data-print-target={printTarget} aria-label="Printable test preview">{activePaperSets.filter((set) => set.questions.length).map((set) => igcse ? <IgcsePaperPreviewPages duration={set.duration} key={set.paper} paper={set.paper} paperTitle={activeTitle} questions={set.questions} school={school} testDate={testDate} /> : <PaperPreviewPages course={course as IBCourse} duration={set.duration} key={set.paper} paper={set.paper} paperTitle={activeTitle} questions={set.questions} school={school} testDate={testDate} />)}</div> : null}
            {previewMode === "mark-scheme" ? <div className="test-print-root" data-print-target={printTarget} aria-label="Printable mark scheme preview">{activePaperSets.filter((set) => set.questions.length).map((set) => <MarkSchemePreviewPages key={set.paper} paper={set.paper} paperTitle={activeTitle} questions={set.questions} />)}</div> : null}
          </div>
        </div>
      </div> : null}
    </>
  );
}
