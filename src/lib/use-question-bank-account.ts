"use client";

import { RefObject, useEffect, useRef } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";

type Bank = "ib" | "igcse";

type QuestionBankMessage = {
  type?: string;
  questionId?: string;
  completed?: boolean;
  document?: unknown;
};

export function useQuestionBankAccount(frameRef: RefObject<HTMLIFrameElement | null>, bank: Bank, assignmentId?: string, viewedStudentId?: string) {
  const router = useRouter();
  const clientRef = useRef<SupabaseClient | null>(null);
  const userRef = useRef<User | null>(null);
  const completedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const frame = frameRef.current;
    let cancelled = false;

    function send(data: Record<string, unknown>) {
      frameRef.current?.contentWindow?.postMessage(data, window.location.origin);
    }

    async function publishAccountState(user: User | null) {
      userRef.current = user;
      completedRef.current = new Set();
      if (user && clientRef.current) {
        let pageStart = 0;
        while (true) {
          let progressQuery = clientRef.current
            .from(assignmentId ? "assignment_question_progress" : "question_progress")
            .select("question_id")
            .eq(assignmentId ? "assignment_id" : "bank", assignmentId || bank)
            .eq("completed", true);
          if (assignmentId && viewedStudentId) progressQuery = progressQuery.eq("student_id", viewedStudentId);
          const { data, error } = await progressQuery.range(pageStart, pageStart + 999);
          if (cancelled) return;
          if (error || !data) break;
          data.forEach((row) => completedRef.current.add(String(row.question_id)));
          if (data.length < 1000) break;
          pageStart += 1000;
        }
      }
      send({
        type: "mrflynnib-account-state",
        configured: Boolean(clientRef.current),
        signedIn: Boolean(user),
        readOnly: Boolean(viewedStudentId),
        completedQuestionIds: Array.from(completedRef.current),
      });
    }

    async function handleMessage(event: MessageEvent<QuestionBankMessage>) {
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      const message = event.data;
      const questionId = typeof message.questionId === "string" ? message.questionId.slice(0, 160) : "";

      if (message.type === "mrflynnib-question-bank-ready") {
        await publishAccountState(userRef.current);
        return;
      }

      if (message.type === "mrflynnib-account-required") {
        const next = `${window.location.pathname}${window.location.search}`;
        router.push(`/account?next=${encodeURIComponent(next)}`);
        return;
      }

      if (!questionId || !clientRef.current || !userRef.current) return;

      if (message.type === "mrflynnib-progress-set") {
        if (viewedStudentId) return;
        const completed = Boolean(message.completed);
        const { error } = await clientRef.current.from("question_progress").upsert({
          user_id: userRef.current.id,
          bank,
          question_id: questionId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,bank,question_id" });
        let assignmentError = null;
        if (!error && assignmentId) {
          const result = await clientRef.current.from("assignment_question_progress").upsert({
            assignment_id: assignmentId,
            student_id: userRef.current.id,
            question_id: questionId,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "assignment_id,student_id,question_id" });
          assignmentError = result.error;
          if (!assignmentError) {
            await clientRef.current.from("assignment_submissions").upsert({
              assignment_id: assignmentId,
              student_id: userRef.current.id,
              status: "in_progress",
              submitted_at: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "assignment_id,student_id" });
          }
        }
        if (!error && !assignmentError) {
          if (completed) completedRef.current.add(questionId);
          else completedRef.current.delete(questionId);
        }
        send({ type: "mrflynnib-progress-result", questionId, completed, ok: !error && !assignmentError });
        return;
      }

      if (message.type === "mrflynnib-whiteboard-load") {
        let whiteboardQuery = clientRef.current
          .from("whiteboard_documents")
          .select("document,updated_at")
          .eq("bank", bank)
          .eq("question_id", questionId);
        if (viewedStudentId) whiteboardQuery = whiteboardQuery.eq("user_id", viewedStudentId);
        const { data, error } = await whiteboardQuery.maybeSingle();
        send({
          type: "mrflynnib-whiteboard-data",
          questionId,
          document: data?.document ?? null,
          updatedAt: data?.updated_at ?? null,
          ok: !error,
        });
        return;
      }

      if (message.type === "mrflynnib-whiteboard-save") {
        if (viewedStudentId) {
          send({ type: "mrflynnib-whiteboard-save-result", questionId, ok: false, reason: "read-only" });
          return;
        }
        const encoded = JSON.stringify(message.document ?? null);
        if (encoded.length > 1_500_000) {
          send({ type: "mrflynnib-whiteboard-save-result", questionId, ok: false, reason: "too-large" });
          return;
        }
        const { error } = await clientRef.current.from("whiteboard_documents").upsert({
          user_id: userRef.current.id,
          bank,
          question_id: questionId,
          document: message.document,
          document_version: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,bank,question_id" });
        send({ type: "mrflynnib-whiteboard-save-result", questionId, ok: !error, savedAt: error ? null : new Date().toISOString() });
      }
    }

    window.addEventListener("message", handleMessage);

    if (!hasSupabaseBrowserConfig()) {
      publishAccountState(null);
      return () => window.removeEventListener("message", handleMessage);
    }

    const client = createClient();
    clientRef.current = client;
    client.auth.getUser().then(({ data }) => publishAccountState(data.user));
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      publishAccountState(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("message", handleMessage);
      authListener.subscription.unsubscribe();
    };
  }, [assignmentId, bank, frameRef, router, viewedStudentId]);
}
