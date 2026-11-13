"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuestionBankAccount, type AssignmentQuestionState } from "@/lib/use-question-bank-account";
import type { AssignmentFeedbackMode } from "@/lib/assignment-feedback";

type QuestionBankEmbedProps = {
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL";
  deferUntilLoaded?: boolean;
  topic?: string;
  subtopic?: string;
  questionIds?: string[];
  assignmentId?: string;
  viewedStudentId?: string;
  feedbackMode?: AssignmentFeedbackMode;
  assignmentSubmitted?: boolean;
  assignmentView?: "step" | "overview" | "detail";
  initialQuestions?: AssignmentQuestionState[];
};

export function QuestionBankEmbed({ course, deferUntilLoaded = false, topic, subtopic, questionIds, assignmentId, viewedStudentId, feedbackMode = "immediate", assignmentSubmitted = false, assignmentView, initialQuestions }: QuestionBankEmbedProps) {
  const query = new URLSearchParams({ course, embedded: "1", whiteboard: "6" });
  if (topic) query.set("topic", topic);
  if (subtopic) query.set("subtopic", subtopic);
  if (questionIds?.length) query.set("ids", questionIds.join(","));
  if (assignmentId) {
    query.set("assignmentWork", "1");
    query.set("assignmentId", assignmentId);
  }
  if (assignmentId && feedbackMode === "hidden" && !viewedStudentId) query.set("solutions", "0");
  if (assignmentView) query.set("assignmentView", assignmentView);
  const frameSource = `/question-bank/ib-bank.html?${query.toString()}`;
  const [loadedSource, setLoadedSource] = useState("");
  const frameReady = !deferUntilLoaded || loadedSource === frameSource;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(620);
  const loadingMoreRef = useRef(false);
  const expandedRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(620);
  const [whiteboardExpanded, setWhiteboardExpanded] = useState(false);
  useQuestionBankAccount(frameRef, "ib", assignmentId, { feedbackMode, assignmentSubmitted, initialQuestions, viewedStudentId });

  useEffect(() => {
    if (!deferUntilLoaded) return;
    // A cached iframe can finish loading before React hydrates its onLoad listener.
    const frame = frameRef.current;
    try {
      if (frame?.contentDocument?.readyState === "complete"
        && frame.contentWindow?.location.href === new URL(frameSource, window.location.origin).href) {
        const readyFrame = requestAnimationFrame(() => setLoadedSource(frameSource));
        return () => cancelAnimationFrame(readyFrame);
      }
    } catch {
      // The onLoad handler also reveals browser error pages rather than trapping a blank frame.
    }
  }, [deferUntilLoaded, frameSource]);

  const loadMoreIfNeeded = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || expandedRef.current || loadingMoreRef.current || !hasMoreRef.current) return;

    const distanceFromViewport =
      frame.getBoundingClientRect().top + frameHeightRef.current - window.innerHeight;
    // Start before the final card; a single large diagram can exceed 1400px.
    if (distanceFromViewport > 4000) return;

    loadingMoreRef.current = true;
    frame.contentWindow?.postMessage(
      { type: "mrflynnib-question-bank-load-more" },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const handleFrameMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      if (event.data?.type === "mrflynnib-whiteboard-expanded") {
        expandedRef.current = Boolean(event.data.expanded);
        setWhiteboardExpanded(expandedRef.current);
        return;
      }
      if (event.data?.type !== "mrflynnib-question-bank-height" || expandedRef.current) return;

      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight)) {
        // Keep the final question safely above the website footer. Diagrams,
        // worked solutions and whiteboards can finish laying out after the
        // embedded bank first reports its height, so an exact fit can clip the
        // bottom of the card on some student devices.
        const bottomClearance = assignmentView === "overview" ? 80 : 96;
        frameHeightRef.current = Math.max(620, Math.ceil(nextHeight) + bottomClearance);
        setFrameHeight(frameHeightRef.current);
      }

      hasMoreRef.current = Number(event.data.rendered) < Number(event.data.total);
      loadingMoreRef.current = false;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(loadMoreIfNeeded);
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
  }, [assignmentView, loadMoreIfNeeded]);

  return (
    <div style={{ height: `${frameHeight}px`, position: "relative" }} aria-busy={!frameReady}>
    {!frameReady ? <p role="status" style={{ position: "absolute", top: "1.5rem", left: "1.5rem", color: "#52647b" }}>Loading questions…</p> : null}
    <iframe
      allowFullScreen
      className="qb-bank-frame"
      loading="eager"
      ref={frameRef}
      scrolling="no"
      src={frameSource}
      onLoad={() => setLoadedSource(frameSource)}
      style={{ visibility: frameReady ? "visible" : "hidden", ...(whiteboardExpanded ? {
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        width: "100vw",
        height: "100dvh",
        background: "#fff",
      } : { height: `${frameHeight}px` }) }}
      title={`${course} question bank`}
    />
    </div>
  );
}
