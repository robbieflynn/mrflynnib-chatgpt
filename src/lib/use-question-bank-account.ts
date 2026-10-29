"use client";

import { RefObject, useEffect, useRef } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import type { AssignmentFeedbackMode } from "@/lib/assignment-feedback";

type Bank = "ib" | "igcse";

type QuestionBankMessage = {
  type?: string;
  questionId?: string;
  completed?: boolean;
  starred?: boolean;
  document?: unknown;
  response?: unknown;
};

type AssignmentEmbedOptions = {
  feedbackMode?: AssignmentFeedbackMode;
  assignmentSubmitted?: boolean;
  initialQuestions?: AssignmentQuestionState[];
  viewedStudentId?: string;
};

export type AssignmentQuestionState = {
  attemptCount: number;
  isCorrect: boolean | null;
  optionSeed: string;
  position: number;
  questionId: string;
  readOnly: boolean;
  response: unknown;
  responseOptions: unknown[];
  responseType: string;
  submitted: boolean;
  updatedAt: string | null;
};

type PendingAnswerSave = {
  assignmentId: string;
  attempts: number;
  createdAt: string;
  notified: boolean;
  questionId: string;
  requestId: string;
  response: unknown;
  userId: string;
};

type PendingWhiteboardSave = {
  attempts: number;
  bank: Bank;
  document: unknown;
  notified: boolean;
  questionId: string;
  revision: string;
  userId: string;
};

const pendingAnswerStorageKey = "mrflynnib:pending-assignment-answers:v1";
const pendingWhiteboardStorageKey = "mrflynnib:pending-whiteboards:v1";
const emptyAssignmentQuestions: AssignmentQuestionState[] = [];

function readPendingRecords<T>(storageKey: string): Record<string, T> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, T> : {};
  } catch {
    return {};
  }
}

function writePendingRecords<T>(storageKey: string, records: Record<string, T>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    // A full or unavailable browser store should not stop the live save attempt.
  }
}

function answerSaveKey(entry: Pick<PendingAnswerSave, "assignmentId" | "questionId" | "response" | "userId">) {
  const response = entry.response && typeof entry.response === "object" ? entry.response as { partKey?: unknown } : null;
  return [entry.userId, entry.assignmentId, entry.questionId, String(response?.partKey || "answer")].join(":");
}

function whiteboardSaveKey(entry: Pick<PendingWhiteboardSave, "bank" | "questionId" | "userId">) {
  return [entry.userId, entry.bank, entry.questionId].join(":");
}

function newSaveId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isPermanentSaveError(message: string) {
  return /already been submitted|assignment not found|question not found|must sign in|student account|choose a valid answer|choose an answer|enter an answer|answer is too long|question part was not found/i.test(message);
}

export function useQuestionBankAccount(frameRef: RefObject<HTMLIFrameElement | null>, bank: Bank, assignmentId?: string, options: AssignmentEmbedOptions = {}) {
  const router = useRouter();
  const { feedbackMode = "immediate", assignmentSubmitted = false, initialQuestions = emptyAssignmentQuestions, viewedStudentId } = options;
  const clientRef = useRef<SupabaseClient | null>(null);
  const userRef = useRef<User | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  const starredRef = useRef<Set<string>>(new Set());
  const assignmentQuestionsRef = useRef<AssignmentQuestionState[]>(initialQuestions);

  useEffect(() => {
    const frame = frameRef.current;
    assignmentQuestionsRef.current = initialQuestions;
    let cancelled = false;
    let retryTimer: number | null = null;
    let assignmentRetryTimer: number | null = null;
    let assignmentRetryAttempts = 0;
    const answerSavesInFlight = new Set<string>();
    const answerQuestionsInFlight = new Set<string>();
    const whiteboardSavesInFlight = new Set<string>();

    function send(data: Record<string, unknown>) {
      frameRef.current?.contentWindow?.postMessage(data, window.location.origin);
    }

    function sendAssignmentState() {
      send({
        type: "mrflynnib-assignment-response-state",
        feedbackMode,
        assignmentSubmitted,
        questions: assignmentQuestionsRef.current,
      });
    }

    function scheduleAssignmentStateRetry() {
      if (cancelled || assignmentRetryTimer) return;
      const delay = Math.min(30_000, 1_500 * Math.pow(2, Math.min(assignmentRetryAttempts, 4)));
      assignmentRetryTimer = window.setTimeout(() => {
        assignmentRetryTimer = null;
        void publishAssignmentState();
      }, delay);
    }

    function matchingPendingCount() {
      const userId = userRef.current?.id;
      if (!userId) return 0;
      const answerCount = Object.values(readPendingRecords<PendingAnswerSave>(pendingAnswerStorageKey))
        .filter((entry) => entry.userId === userId && entry.assignmentId === assignmentId).length;
      const whiteboardCount = Object.values(readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey))
        .filter((entry) => entry.userId === userId && entry.bank === bank).length;
      return answerCount + whiteboardCount;
    }

    function publishSyncStatus(state?: "online" | "offline" | "syncing") {
      const pending = matchingPendingCount();
      window.dispatchEvent(new CustomEvent("mrflynnib-sync-status", {
        detail: { pending, state: state || (navigator.onLine ? (pending ? "syncing" : "online") : "offline") },
      }));
    }

    function scheduleRetry(attempts = 0) {
      if (cancelled || retryTimer) return;
      const delay = navigator.onLine ? Math.min(30_000, 1_500 * Math.pow(2, Math.min(attempts, 4))) : 30_000;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void flushPendingSaves();
      }, delay);
    }

    async function deliverPendingAnswer(storageKey: string, entry: PendingAnswerSave) {
      if (cancelled || !clientRef.current || !userRef.current || entry.userId !== userRef.current.id || entry.assignmentId !== assignmentId) return;
      if (answerSavesInFlight.has(storageKey)) return;
      const questionFlightKey = `${entry.assignmentId}:${entry.questionId}`;
      if (answerQuestionsInFlight.has(questionFlightKey)) {
        scheduleRetry(0);
        return;
      }
      if (!navigator.onLine) {
        if (!entry.notified) {
          entry.notified = true;
          const records = readPendingRecords<PendingAnswerSave>(pendingAnswerStorageKey);
          if (records[storageKey]?.requestId === entry.requestId) {
            records[storageKey] = entry;
            writePendingRecords(pendingAnswerStorageKey, records);
          }
          send({ type: "mrflynnib-assignment-response-result", questionId: entry.questionId, response: entry.response, ok: false, queued: true });
        }
        publishSyncStatus("offline");
        scheduleRetry(entry.attempts);
        return;
      }
      answerSavesInFlight.add(storageKey);
      answerQuestionsInFlight.add(questionFlightKey);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      let resultData: { isCorrect?: boolean | null; result?: string | null } | null = null;
      let errorMessage = "";
      let retryable = true;
      try {
        const response = await fetch(`/api/assignments/${encodeURIComponent(entry.assignmentId)}/responses`, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: entry.questionId,
            requestId: entry.requestId,
            response: entry.response,
          }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as { isCorrect?: boolean | null; result?: string | null; message?: string; retryable?: boolean } | null;
        if (response.ok) resultData = payload;
        else {
          errorMessage = payload?.message || `The save service returned ${response.status}.`;
          retryable = payload?.retryable !== false && response.status >= 500;
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "The save service could not be reached.";
      } finally {
        window.clearTimeout(timeout);
        answerSavesInFlight.delete(storageKey);
        answerQuestionsInFlight.delete(questionFlightKey);
      }
      if (cancelled) return;
      const records = readPendingRecords<PendingAnswerSave>(pendingAnswerStorageKey);
      if (records[storageKey]?.requestId !== entry.requestId) return;
      if (!errorMessage) {
        delete records[storageKey];
        writePendingRecords(pendingAnswerStorageKey, records);
        send({
          type: "mrflynnib-assignment-response-result",
          questionId: entry.questionId,
          response: entry.response,
          isCorrect: resultData?.isCorrect ?? null,
          result: resultData?.result ?? null,
          ok: true,
        });
        publishSyncStatus();
        return;
      }
      const message = errorMessage;
      if (!retryable || isPermanentSaveError(message)) {
        delete records[storageKey];
        writePendingRecords(pendingAnswerStorageKey, records);
        send({ type: "mrflynnib-assignment-response-result", questionId: entry.questionId, response: entry.response, ok: false, error: message });
        publishSyncStatus();
        return;
      }
      entry.attempts += 1;
      if (!entry.notified) {
        entry.notified = true;
        send({ type: "mrflynnib-assignment-response-result", questionId: entry.questionId, response: entry.response, ok: false, queued: true });
      }
      records[storageKey] = entry;
      writePendingRecords(pendingAnswerStorageKey, records);
      publishSyncStatus("syncing");
      scheduleRetry(entry.attempts);
    }

    async function deliverPendingWhiteboard(storageKey: string, entry: PendingWhiteboardSave) {
      if (cancelled || !clientRef.current || !userRef.current || entry.userId !== userRef.current.id || entry.bank !== bank) return;
      if (whiteboardSavesInFlight.has(storageKey)) return;
      if (!navigator.onLine) {
        if (!entry.notified) {
          entry.notified = true;
          const records = readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey);
          if (records[storageKey]?.revision === entry.revision) {
            records[storageKey] = entry;
            writePendingRecords(pendingWhiteboardStorageKey, records);
          }
          send({ type: "mrflynnib-whiteboard-save-result", questionId: entry.questionId, ok: false, reason: "queued" });
        }
        publishSyncStatus("offline");
        scheduleRetry(entry.attempts);
        return;
      }
      whiteboardSavesInFlight.add(storageKey);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      let failed = false;
      try {
        const result = await clientRef.current.from("whiteboard_documents").upsert({
          user_id: entry.userId,
          bank: entry.bank,
          question_id: entry.questionId,
          document: entry.document,
          document_version: 1,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,bank,question_id" }).abortSignal(controller.signal);
        failed = Boolean(result.error);
      } catch {
        failed = true;
      } finally {
        window.clearTimeout(timeout);
        whiteboardSavesInFlight.delete(storageKey);
      }
      if (cancelled) return;
      const records = readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey);
      const current = records[storageKey];
      if (!failed) {
        if (current?.revision === entry.revision) {
          delete records[storageKey];
          send({ type: "mrflynnib-whiteboard-save-result", questionId: entry.questionId, ok: true, savedAt: new Date().toISOString() });
        }
        writePendingRecords(pendingWhiteboardStorageKey, records);
        publishSyncStatus();
        if (current && current.revision !== entry.revision) void deliverPendingWhiteboard(storageKey, current);
        return;
      }
      if (current?.revision === entry.revision) {
        entry.attempts += 1;
        if (!entry.notified) {
          entry.notified = true;
          send({ type: "mrflynnib-whiteboard-save-result", questionId: entry.questionId, ok: false, reason: "queued" });
        }
        records[storageKey] = entry;
        writePendingRecords(pendingWhiteboardStorageKey, records);
      }
      publishSyncStatus("syncing");
      scheduleRetry(entry.attempts);
    }

    async function flushPendingSaves() {
      const userId = userRef.current?.id;
      if (!userId) return;
      const answerRecords = readPendingRecords<PendingAnswerSave>(pendingAnswerStorageKey);
      const whiteboardRecords = readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey);
      await Promise.all([
        ...Object.entries(answerRecords)
          .filter(([, entry]) => entry.userId === userId && entry.assignmentId === assignmentId)
          .map(([key, entry]) => deliverPendingAnswer(key, entry)),
        ...Object.entries(whiteboardRecords)
          .filter(([, entry]) => entry.userId === userId && entry.bank === bank)
          .map(([key, entry]) => deliverPendingWhiteboard(key, entry)),
      ]);
      publishSyncStatus();
    }

    async function publishAssignmentState() {
      if (!assignmentId || !clientRef.current || !userRef.current) {
        sendAssignmentState();
        return;
      }
      // The server-rendered state makes the answer controls available immediately,
      // even while Supabase is slow or temporarily unreachable.
      sendAssignmentState();
      const studentId = viewedStudentId || userRef.current.id;
      const [{ data: questions, error: questionError }, { data: responses, error: responseError }] = await Promise.all([
        clientRef.current.from("assignment_questions").select("question_id,response_type,response_options,position").eq("assignment_id", assignmentId).order("position"),
        clientRef.current.from("assignment_responses").select("question_id,response,is_correct,attempt_count,updated_at").eq("assignment_id", assignmentId).eq("student_id", studentId),
      ]);
      if (cancelled) return;
      if (questionError || responseError) {
        assignmentRetryAttempts += 1;
        scheduleAssignmentStateRetry();
        return;
      }
      const responseByQuestion = new Map((responses ?? []).map((row) => [String(row.question_id), row]));
      const authoritativeConfigByQuestion = new Map(
        initialQuestions.map((question) => [question.questionId, question]),
      );
      assignmentRetryAttempts = 0;
      assignmentQuestionsRef.current = (questions ?? []).map((question) => {
          const saved = responseByQuestion.get(String(question.question_id));
          const authoritative = authoritativeConfigByQuestion.get(String(question.question_id));
          return {
            questionId: String(question.question_id),
            responseType: authoritative?.responseType ?? String(question.response_type || "teacher_review"),
            responseOptions: authoritative?.responseOptions ?? (Array.isArray(question.response_options) ? question.response_options : []),
            response: saved?.response ?? null,
            isCorrect: saved?.is_correct ?? null,
            attemptCount: saved?.attempt_count ?? 0,
            updatedAt: saved?.updated_at ?? null,
            readOnly: Boolean(viewedStudentId) || assignmentSubmitted,
            submitted: assignmentSubmitted && !viewedStudentId,
            position: Number(question.position || 0),
            optionSeed: studentId,
          };
      });
      sendAssignmentState();
    }

    async function publishAccountState(user: User | null) {
      userRef.current = user;
      completedRef.current = new Set();
      starredRef.current = new Set();
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
        if (!assignmentId) {
          pageStart = 0;
          while (true) {
            const { data, error } = await clientRef.current
              .from("question_stars")
              .select("question_id")
              .eq("user_id", user.id)
              .eq("bank", bank)
              .range(pageStart, pageStart + 999);
            if (cancelled) return;
            if (error || !data) break;
            data.forEach((row) => starredRef.current.add(String(row.question_id)));
            if (data.length < 1000) break;
            pageStart += 1000;
          }
        }
      }
      send({
        type: "mrflynnib-account-state",
        configured: Boolean(clientRef.current),
        signedIn: Boolean(user),
        readOnly: Boolean(viewedStudentId) || Boolean(assignmentId && assignmentSubmitted),
        completedQuestionIds: Array.from(completedRef.current),
        starredQuestionIds: Array.from(starredRef.current),
      });
      if (assignmentId) await publishAssignmentState();
      if (user) void flushPendingSaves();
    }

    async function handleMessage(event: MessageEvent<QuestionBankMessage>) {
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      const message = event.data;
      const questionId = typeof message.questionId === "string" ? message.questionId.slice(0, 160) : "";

      if (message.type === "mrflynnib-question-bank-ready") {
        await publishAccountState(userRef.current);
        return;
      }

      if (message.type === "mrflynnib-assignment-responses-ready") {
        await publishAssignmentState();
        return;
      }

      if (message.type === "mrflynnib-account-required") {
        const next = `${window.location.pathname}${window.location.search}`;
        router.push(`${bank === "igcse" ? "/igcse/account" : "/account"}?next=${encodeURIComponent(next)}`);
        return;
      }

      if (message.type === "mrflynnib-assignment-scroll-top") {
        frameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (message.type === "mrflynnib-assignment-question-detail" && assignmentId && viewedStudentId && questionId) {
        router.push(`/teacher/assignments/${assignmentId}/students/${viewedStudentId}?question=${encodeURIComponent(questionId)}`);
        return;
      }

      if (!questionId || !clientRef.current || !userRef.current) return;

      if (message.type === "mrflynnib-star-set") {
        if (assignmentId || viewedStudentId) return;
        const starred = Boolean(message.starred);
        const result = starred
          ? await clientRef.current.from("question_stars").insert({
              user_id: userRef.current.id,
              bank,
              question_id: questionId,
            })
          : await clientRef.current.from("question_stars").delete()
              .eq("user_id", userRef.current.id)
              .eq("bank", bank)
              .eq("question_id", questionId);
        // A duplicate means this question was already starred in another tab.
        // Treat it as success so the account state remains consistent without
        // requiring UPDATE access for what is otherwise an insert-only action.
        const succeeded = !result.error || (starred && result.error.code === "23505");
        if (succeeded) {
          if (starred) starredRef.current.add(questionId);
          else starredRef.current.delete(questionId);
        }
        send({
          type: "mrflynnib-star-result",
          questionId,
          starred,
          ok: succeeded,
          error: result.error?.message ?? null,
        });
        return;
      }

      if (message.type === "mrflynnib-assignment-response-save") {
        if (!assignmentId || viewedStudentId) return;
        if (assignmentSubmitted) {
          send({ type: "mrflynnib-assignment-response-result", questionId, response: message.response ?? null, ok: false, error: "This assignment has already been submitted." });
          return;
        }
        const encoded = JSON.stringify(message.response ?? null);
        if (encoded.length > 2_000) {
          send({ type: "mrflynnib-assignment-response-result", questionId, response: message.response ?? null, ok: false });
          return;
        }
        const entry: PendingAnswerSave = {
          assignmentId,
          attempts: 0,
          createdAt: new Date().toISOString(),
          notified: false,
          questionId,
          requestId: newSaveId(),
          response: message.response ?? null,
          userId: userRef.current.id,
        };
        const storageKey = answerSaveKey(entry);
        const records = readPendingRecords<PendingAnswerSave>(pendingAnswerStorageKey);
        records[storageKey] = entry;
        writePendingRecords(pendingAnswerStorageKey, records);
        publishSyncStatus("syncing");
        send({ type: "mrflynnib-assignment-response-result", questionId, response: entry.response, ok: false, pending: true });
        void deliverPendingAnswer(storageKey, entry);
        return;
      }

      if (message.type === "mrflynnib-progress-set") {
        if (viewedStudentId) return;
        if (assignmentId && assignmentSubmitted) {
          send({ type: "mrflynnib-progress-result", questionId, completed: Boolean(message.completed), ok: false, error: "This assignment has already been submitted." });
          return;
        }
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
        send({
          type: "mrflynnib-progress-result",
          questionId,
          completed,
          ok: !error && !assignmentError,
          error: error?.message ?? assignmentError?.message ?? null,
        });
        return;
      }

      if (message.type === "mrflynnib-whiteboard-load") {
        const localWhiteboards = readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey);
        const localWhiteboardKey = whiteboardSaveKey({ bank, questionId, userId: userRef.current.id });
        const localWhiteboard = localWhiteboards[localWhiteboardKey];
        if (localWhiteboard) {
          send({ type: "mrflynnib-whiteboard-data", questionId, document: localWhiteboard.document, updatedAt: null, ok: true, pending: true });
          void deliverPendingWhiteboard(localWhiteboardKey, localWhiteboard);
          return;
        }
        if (assignmentId && (assignmentSubmitted || viewedStudentId)) {
          const studentId = viewedStudentId || userRef.current.id;
          const { data: snapshot, error: snapshotError } = await clientRef.current
            .from("assignment_whiteboard_snapshots")
            .select("document,saved_at")
            .eq("assignment_id", assignmentId)
            .eq("student_id", studentId)
            .eq("question_id", questionId)
            .maybeSingle();
          if (snapshot) {
            send({ type: "mrflynnib-whiteboard-data", questionId, document: snapshot.document, updatedAt: snapshot.saved_at, ok: true });
            return;
          }
          if (snapshotError && snapshotError.code !== "PGRST116") {
            send({ type: "mrflynnib-whiteboard-data", questionId, document: null, updatedAt: null, ok: false });
            return;
          }
        }
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
        if (viewedStudentId || (assignmentId && assignmentSubmitted)) {
          send({ type: "mrflynnib-whiteboard-save-result", questionId, ok: false, reason: "read-only" });
          return;
        }
        const encoded = JSON.stringify(message.document ?? null);
        if (encoded.length > 1_500_000) {
          send({ type: "mrflynnib-whiteboard-save-result", questionId, ok: false, reason: "too-large" });
          return;
        }
        const entry: PendingWhiteboardSave = {
          attempts: 0,
          bank,
          document: message.document,
          notified: false,
          questionId,
          revision: newSaveId(),
          userId: userRef.current.id,
        };
        const storageKey = whiteboardSaveKey(entry);
        const records = readPendingRecords<PendingWhiteboardSave>(pendingWhiteboardStorageKey);
        records[storageKey] = entry;
        writePendingRecords(pendingWhiteboardStorageKey, records);
        publishSyncStatus("syncing");
        void deliverPendingWhiteboard(storageKey, entry);
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
    const handleOnline = () => void flushPendingSaves();
    const handleOffline = () => publishSyncStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (assignmentRetryTimer) window.clearTimeout(assignmentRetryTimer);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      authListener.subscription.unsubscribe();
    };
  }, [assignmentId, assignmentSubmitted, bank, feedbackMode, frameRef, initialQuestions, router, viewedStudentId]);
}
