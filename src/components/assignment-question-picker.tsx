"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AssignmentQuestionPickerProps = {
  bank: "ib" | "igcse";
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";
};

export function AssignmentQuestionPicker({ bank, course }: AssignmentQuestionPickerProps) {
  const initialFrameHeight = bank === "igcse" ? 760 : 620;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(initialFrameHeight);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(initialFrameHeight);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [responseConfigs, setResponseConfigs] = useState<Record<string, unknown>[]>([]);
  const source = useMemo(() => {
    const query = new URLSearchParams({ course, embedded: "1", assignment: "1" });
    return `/question-bank/${bank === "igcse" ? "igcse-bank.html" : "ib-bank.html"}?${query.toString()}`;
  }, [bank, course]);

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
          frameHeightRef.current = Math.max(bank === "igcse" ? 760 : 620, Math.ceil(nextHeight));
          setFrameHeight(frameHeightRef.current);
        }
        hasMoreRef.current = Number(event.data.rendered) < Number(event.data.total);
        loadingMoreRef.current = false;
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(loadMoreIfNeeded);
      }
      if (event.data?.type === "mrflynnib-assignment-selection" && Array.isArray(event.data.ids)) {
        setSelectedIds(event.data.ids.map(String).slice(0, 40));
        setResponseConfigs(Array.isArray(event.data.configs) ? event.data.configs.slice(0, 40) : []);
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
        <strong>{selectedIds.length} {selectedIds.length === 1 ? "question" : "questions"} selected</strong>
        <span>Select up to 40 questions and choose how each answer should be checked.</span>
      </div>
      <iframe className="assignment-bank-frame" loading="eager" ref={frameRef} scrolling="no" src={source} style={{ height: `${frameHeight}px` }} title={`${course} assignment question selector`} />
    </div>
  );
}
