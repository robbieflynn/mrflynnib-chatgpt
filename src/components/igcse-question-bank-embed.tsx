"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function IgcseQuestionBankEmbed() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(760);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(760);

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
      src="/question-bank/igcse-bank.html?embedded=1&whiteboard=5"
      style={{ height: `${frameHeight}px` }}
      title="Edexcel IGCSE Mathematics question bank"
    />
  );
}
