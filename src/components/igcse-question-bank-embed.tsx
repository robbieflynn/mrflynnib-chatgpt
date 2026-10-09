"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuestionBankAccount } from "@/lib/use-question-bank-account";
import type { AssignmentFeedbackMode } from "@/lib/assignment-feedback";

export function IgcseQuestionBankEmbed({ topic, subtopic, questionIds, assignmentId, viewedStudentId, feedbackMode = "immediate", assignmentSubmitted = false, assignmentView }: { topic?: string; subtopic?: string; questionIds?: string[]; assignmentId?: string; viewedStudentId?: string; feedbackMode?: AssignmentFeedbackMode; assignmentSubmitted?: boolean; assignmentView?: "step" | "overview" | "detail" }) {
  const query = new URLSearchParams({ course: "IGCSE Higher", embedded: "1", whiteboard: "6" });
  if (topic) query.set("topic", topic);
  if (subtopic) query.set("subtopic", subtopic);
  if (questionIds?.length) query.set("ids", questionIds.join(","));
  if (assignmentId) query.set("assignmentWork", "1");
  if (assignmentId && feedbackMode === "hidden" && !viewedStudentId) query.set("solutions", "0");
  if (assignmentView) query.set("assignmentView", assignmentView);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(760);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(760);
  useQuestionBankAccount(frameRef, "igcse", assignmentId, { feedbackMode, assignmentSubmitted, viewedStudentId });

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
      if (
        event.origin !== window.location.origin ||
        event.source !== frame?.contentWindow ||
        event.data?.type !== "mrflynnib-question-bank-height"
      ) {
        return;
      }

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
      className="igcse-qb-frame"
      loading="eager"
      ref={frameRef}
      scrolling="no"
      src={`/question-bank/igcse-bank.html?${query.toString()}`}
      style={{ height: `${frameHeight}px` }}
      title="Edexcel IGCSE Mathematics question bank"
    />
  );
}
