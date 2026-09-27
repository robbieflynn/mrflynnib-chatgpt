"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type QuestionBankEmbedProps = {
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL";
};

export function QuestionBankEmbed({ course }: QuestionBankEmbedProps) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const pathname = usePathname();
  const router = useRouter();
  const query = new URLSearchParams({ course, embedded: "1", whiteboard: "6" });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHeightRef = useRef(620);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [frameHeight, setFrameHeight] = useState(620);
  const [progressLoading, setProgressLoading] = useState(configured);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [correctQuestionIds, setCorrectQuestionIds] = useState<string[]>([]);
  const [progressError, setProgressError] = useState("");
  const [savingQuestionId, setSavingQuestionId] = useState("");

  const accountHref = `/account?next=${encodeURIComponent(pathname)}`;

  const sendProgressToFrame = useCallback((overrides?: { savingId?: string; error?: string }) => {
    frameRef.current?.contentWindow?.postMessage({
      type: "mrflynnib-question-bank-progress",
      configured,
      signedIn,
      correctQuestionIds,
      savingId: overrides?.savingId ?? savingQuestionId,
      error: overrides?.error ?? progressError,
    }, window.location.origin);
  }, [configured, correctQuestionIds, progressError, savingQuestionId, signedIn]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const loadProgress = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      const user = userData.user;
      setSignedIn(Boolean(user));
      setUserId(user?.id ?? "");

      if (!user) {
        setCorrectQuestionIds([]);
        setProgressError("");
        setProgressLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("question_progress")
        .select("question_id")
        .eq("bank", "IB");
      if (!active) return;
      setCorrectQuestionIds(error ? [] : (data ?? []).map((row) => String(row.question_id)));
      setProgressError(error ? "Saved progress is not available on this preview yet." : "");
      setProgressLoading(false);
    };

    void loadProgress();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadProgress(), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    sendProgressToFrame();
  }, [sendProgressToFrame]);

  const toggleCorrect = useCallback(async (questionId: string) => {
    if (!supabase || !signedIn || !userId) {
      router.push(accountHref);
      return;
    }
    if (!questionId || questionId.length > 180) return;

    const wasCorrect = correctQuestionIds.includes(questionId);
    const nextIds = wasCorrect
      ? correctQuestionIds.filter((id) => id !== questionId)
      : [...correctQuestionIds, questionId];
    setSavingQuestionId(questionId);
    setProgressError("");
    setCorrectQuestionIds(nextIds);

    const result = wasCorrect
      ? await supabase.from("question_progress").delete().eq("user_id", userId).eq("bank", "IB").eq("question_id", questionId)
      : await supabase.from("question_progress").upsert({
          user_id: userId,
          bank: "IB",
          course,
          question_id: questionId,
          correct_at: new Date().toISOString(),
        }, { onConflict: "user_id,bank,question_id" });

    if (result.error) {
      setCorrectQuestionIds(correctQuestionIds);
      setProgressError("We could not save that change. Please try again.");
      setSavingQuestionId("");
      return;
    }
    setSavingQuestionId("");
    setProgressError("");
  }, [accountHref, correctQuestionIds, course, router, signedIn, supabase, userId]);

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

      if (event.data?.type === "mrflynnib-question-bank-progress-toggle") {
        void toggleCorrect(String(event.data.questionId ?? ""));
        return;
      }

      if (event.data?.type === "mrflynnib-question-bank-sign-in") {
        router.push(accountHref);
        return;
      }

      if (event.data?.type !== "mrflynnib-question-bank-height") return;

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
  }, [accountHref, loadMoreIfNeeded, router, toggleCorrect]);

  return (
    <div className="qb-embed-shell">
      <div className="qb-account-strip" aria-live="polite">
        <div>
          <strong>{progressLoading ? "Checking your progress…" : signedIn ? `${correctQuestionIds.length} ${correctQuestionIds.length === 1 ? "question" : "questions"} saved as correct` : "Save your question bank progress"}</strong>
          <span>{signedIn ? "Your progress is saved to your Mr Flynn IB account." : "Sign in after checking an answer to keep the questions you got right."}</span>
          {progressError && <span className="qb-account-error">{progressError}</span>}
        </div>
        <Link className="button button-secondary button-small" href={signedIn ? "/account" : accountHref}>{signedIn ? "View account" : "Sign in or create account"}</Link>
      </div>
      <iframe
        className="qb-bank-frame"
        loading="eager"
        onLoad={() => sendProgressToFrame()}
        ref={frameRef}
        scrolling="no"
        src={`/question-bank/ib-bank.html?${query.toString()}`}
        style={{ height: `${frameHeight}px` }}
        title={`${course} question bank`}
      />
    </div>
  );
}
