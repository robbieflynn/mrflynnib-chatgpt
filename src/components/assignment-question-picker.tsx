"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";

type AssignmentQuestionPickerProps = {
  bank: "ib" | "igcse";
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";
  draftId: string;
};

type SelectedQuestionSummary = {
  id: string;
  title: string;
  topic: string;
  subtopic: string;
  paper: string;
  difficulty: string;
  marks: number | null;
};

function mathematicalSummaryTitle(value: string) {
  return value
    .replace(/\b(cos|sin|tan)\s+([A-Z]{3})\s*=\s*(-?\d+)\s*\/\s*(-?\d+)/g, String.raw`\($1 $2 = \frac{$3}{$4}\)`)
    .replace(/\b(cos|sin|tan)\s+([A-Z]{3})\b/g, String.raw`\($1 $2\)`)
    .replace(/\bangle\s+([A-Z]{3})\b/gi, String.raw`\(\angle $1\)`)
    .replace(/(-?\d*)√(\d+)/g, (_match, coefficient, radicand) => String.raw`\(${coefficient}\sqrt{${radicand}}\)`)
    .replace(/\b(-?\d+)\s*\/\s*(-?\d+)\b/g, String.raw`\(\frac{$1}{$2}\)`);
}

function SummaryMath({ children }: { children: string }) {
  const text = mathematicalSummaryTitle(children);
  const pieces: React.ReactNode[] = [];
  const pattern = /\\\(([\s\S]*?)\\\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) pieces.push(text.slice(lastIndex, match.index));
    pieces.push(<span dangerouslySetInnerHTML={{ __html: katex.renderToString(match[1], { throwOnError: false, strict: false }) }} key={`${match.index}-${match[1]}`} />);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));
  return <>{pieces}</>;
}

function cleanSummary(value: unknown): SelectedQuestionSummary | null {
  if (!value || typeof value !== "object") return null;
  const summary = value as Record<string, unknown>;
  const id = String(summary.id || "").slice(0, 100);
  if (!id) return null;
  const text = (field: string) => String(summary[field] || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const marks = Number(summary.marks);
  return {
    id,
    title: text("title") || "Selected question",
    topic: text("topic"),
    subtopic: text("subtopic"),
    paper: text("paper"),
    difficulty: text("difficulty"),
    marks: Number.isFinite(marks) && marks > 0 ? marks : null,
  };
}

export function AssignmentQuestionPicker({ bank, course, draftId }: AssignmentQuestionPickerProps) {
  const initialFrameHeight = bank === "igcse" ? 760 : 620;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(initialFrameHeight);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(initialFrameHeight);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [responseConfigs, setResponseConfigs] = useState<Record<string, unknown>[]>([]);
  const [questionSummaries, setQuestionSummaries] = useState<Record<string, SelectedQuestionSummary>>({});
  const source = useMemo(() => {
    const query = new URLSearchParams({ course, embedded: "1", assignment: "1", draft: draftId });
    return `/question-bank/${bank === "igcse" ? "igcse-bank.html" : "ib-bank.html"}?${query.toString()}`;
  }, [bank, course, draftId]);

  const loadMoreIfNeeded = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || loadingMoreRef.current || !hasMoreRef.current) return;
    const distanceFromViewport = frame.getBoundingClientRect().top + frameHeightRef.current - window.innerHeight;
    if (distanceFromViewport > 1400) return;
    loadingMoreRef.current = true;
    frame.contentWindow?.postMessage({ type: "mrflynnib-question-bank-load-more" }, window.location.origin);
  }, []);

  const clearSelection = useCallback(() => {
    try {
      window.sessionStorage.removeItem(`mrflynnib-assignment-draft:${draftId}`);
    } catch {
      // The selector still clears even when browser storage is restricted.
    }
    setSelectedIds([]);
    setResponseConfigs([]);
    setQuestionSummaries({});
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-assignment-clear" }, window.location.origin);
  }, [draftId]);

  const removeQuestion = useCallback((id: string) => {
    frameRef.current?.contentWindow?.postMessage({ type: "mrflynnib-assignment-remove", id }, window.location.origin);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const handleFrameMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.type === "mrflynnib-question-bank-height") {
        const nextHeight = Number(event.data.height);
        if (Number.isFinite(nextHeight)) {
          frameHeightRef.current = Math.max(bank === "igcse" ? 760 : 620, Math.ceil(nextHeight));
          setFrameHeight(frameHeightRef.current);
        }
        hasMoreRef.current = Number(event.data.rendered) < Number(event.data.total);
        loadingMoreRef.current = false;
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(loadMoreIfNeeded);
      }
      if (event.data?.type === "mrflynnib-assignment-selection" && Array.isArray(event.data.ids)) {
        const ids = event.data.ids.map(String).slice(0, 100);
        setSelectedIds(ids);
        setResponseConfigs(Array.isArray(event.data.configs) ? event.data.configs.slice(0, 100) : []);
        setQuestionSummaries((current) => {
          const next = { ...current };
          if (Array.isArray(event.data.summaries)) {
            event.data.summaries.forEach((value: unknown) => {
              const summary = cleanSummary(value);
              if (summary && ids.includes(summary.id)) next[summary.id] = summary;
            });
          }
          Object.keys(next).forEach((id) => { if (!ids.includes(id)) delete next[id]; });
          return next;
        });
      }
    };

    let scrollTicking = false;
    const handleViewportChange = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        loadMoreIfNeeded();
        scrollTicking = false;
      });
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
  }, [bank, loadMoreIfNeeded]);

  return (
    <div className="assignment-picker stack">
      {selectedIds.map((id) => <input key={id} name="questionIds" type="hidden" value={id} />)}
      {selectedIds.map((id, index) => <input key={`response-${id}`} name="responseConfigs" type="hidden" value={JSON.stringify({ id, ...(responseConfigs[index] || {}) })} />)}
      <div className="assignment-picker-summary" aria-live="polite">
        <span className="assignment-picker-summary-copy"><strong>{selectedIds.length} {selectedIds.length === 1 ? "question" : "questions"} selected for this assignment</strong><span>Select up to 100 questions. Your assignment contents are listed below.</span></span>
        {selectedIds.length ? <button className="button button-secondary button-small" onClick={clearSelection} type="button">Remove all questions</button> : null}
      </div>
      <section className="assignment-selection-review" aria-labelledby="assignment-selection-heading">
        <div className="assignment-selection-heading">
          <div><p className="eyebrow">Assignment contents</p><h3 id="assignment-selection-heading">Selected questions</h3></div>
          <span>{selectedIds.length} of 100</span>
        </div>
        {selectedIds.length ? (
          <ol className="assignment-selection-list">
            {selectedIds.map((id, index) => {
              const summary = questionSummaries[id];
              const details = [summary?.paper, summary?.topic, summary?.subtopic, summary?.difficulty].filter(Boolean);
              return (
                <li key={id}>
                  <span className="assignment-selection-number">{index + 1}</span>
                  <span className="assignment-selection-copy">
                    <strong><SummaryMath>{summary?.title || "Selected question"}</SummaryMath></strong>
                    {details.length ? <span>{details.join(" · ")}</span> : null}
                    {summary?.marks ? <small>{summary.marks} {summary.marks === 1 ? "mark" : "marks"}</small> : null}
                  </span>
                  <button aria-label={`Remove ${summary?.title || `question ${index + 1}`} from the assignment`} onClick={() => removeQuestion(id)} type="button">Remove</button>
                </li>
              );
            })}
          </ol>
        ) : <div className="assignment-selection-empty"><strong>No questions selected yet</strong><span>Choose questions from the bank below. They will appear here in the order students will receive them.</span></div>}
      </section>
      <iframe className="assignment-bank-frame" loading="eager" ref={frameRef} scrolling="no" src={source} style={{ height: `${frameHeight}px` }} title={`${course} assignment question selector`} />
    </div>
  );
}
