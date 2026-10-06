"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuestionBankAccount } from "@/lib/use-question-bank-account";

type QuestionBankEmbedProps = {
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL";
  topic?: string;
  subtopic?: string;
  questionIds?: string[];
  assignmentId?: string;
  viewedStudentId?: string;
};

export function QuestionBankEmbed({ course, topic, subtopic, questionIds, assignmentId, viewedStudentId }: QuestionBankEmbedProps) {
  const query = new URLSearchParams({ course, embedded: "1", whiteboard: "6" });
  if (topic) query.set("topic", topic);
  if (subtopic) query.set("subtopic", subtopic);
  if (questionIds?.length) query.set("ids", questionIds.join(","));
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(620);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(620);
  useQuestionBankAccount(frameRef, "ib", assignmentId, viewedStudentId);

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
        frameHeightRef.current = Math.max(620, Math.ceil(nextHeight));
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
      className="qb-bank-frame"
      loading="eager"
      ref={frameRef}
      scrolling="no"
      src={`/question-bank/ib-bank.html?${query.toString()}`}
      style={{ height: `${frameHeight}px` }}
      title={`${course} question bank`}
    />
  );
}
