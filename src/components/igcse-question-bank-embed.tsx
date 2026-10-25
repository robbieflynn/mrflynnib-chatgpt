"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuestionBankAccount, type AssignmentQuestionState } from "@/lib/use-question-bank-account";
import type { AssignmentFeedbackMode } from "@/lib/assignment-feedback";

export function IgcseQuestionBankEmbed({ topic, subtopic, questionIds, assignmentId, viewedStudentId, feedbackMode = "immediate", assignmentSubmitted = false, assignmentView, initialQuestions }: { topic?: string; subtopic?: string; questionIds?: string[]; assignmentId?: string; viewedStudentId?: string; feedbackMode?: AssignmentFeedbackMode; assignmentSubmitted?: boolean; assignmentView?: "step" | "overview" | "detail"; initialQuestions?: AssignmentQuestionState[] }) {
  const query = new URLSearchParams({ course: "IGCSE Higher", embedded: "1", whiteboard: "6" });
  if (topic) query.set("topic", topic);
  if (subtopic) query.set("subtopic", subtopic);
  if (questionIds?.length) query.set("ids", questionIds.join(","));
  if (assignmentId) {
    query.set("assignmentWork", "1");
    query.set("assignmentId", assignmentId);
  }
  if (assignmentId && feedbackMode === "hidden" && !viewedStudentId) query.set("solutions", "0");
  if (assignmentView) query.set("assignmentView", assignmentView);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(760);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(760);
  const [whiteboardExpanded, setWhiteboardExpanded] = useState(false);
  useQuestionBankAccount(frameRef, "igcse", assignmentId, { feedbackMode, assignmentSubmitted, initialQuestions, viewedStudentId });

  const loadMoreIfNeeded = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || loadingMoreRef.current || !hasMoreRef.current) return;

    const distanceFromViewport =
      frame.getBoundingClientRect().top + frameHeightRef.current - window.innerHeight;
    if (distanceFromViewport > 1400) return;

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
        setWhiteboardExpanded(Boolean(event.data.expanded));
        return;
      }
      if (event.data?.type !== "mrflynnib-question-bank-height") return;

      const nextHeight = Number(event.data.height);
      if (Number.isFinite(nextHeight)) {
        frameHeightRef.current = Math.max(760, Math.ceil(nextHeight));
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
  }, [loadMoreIfNeeded]);

  return (
    <iframe
      allowFullScreen
      className="igcse-qb-frame"
      loading="eager"
      ref={frameRef}
      scrolling="no"
      src={`/question-bank/igcse-bank.html?${query.toString()}`}
      style={whiteboardExpanded ? {
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        width: "100vw",
        height: "100dvh",
        background: "#fff",
      } : { height: `${frameHeight}px` }}
      title="Edexcel IGCSE Mathematics question bank"
    />
  );
}
