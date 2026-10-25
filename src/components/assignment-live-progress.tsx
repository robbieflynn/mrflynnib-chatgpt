"use client";

import { useEffect, useState } from "react";
import { submitAssignment } from "@/app/account/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type ProgressCounts = {
  answered: number;
  completed: number;
  correct: number;
};

type ProgressMessage = {
  type?: string;
  assignmentId?: string;
  answered?: unknown;
  completed?: unknown;
  correct?: unknown;
  total?: unknown;
};

function safeCount(value: unknown, total: number) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.min(total, Math.round(count))) : 0;
}

function useAssignmentProgress(assignmentId: string, total: number, initial: ProgressCounts) {
  const [progress, setProgress] = useState(initial);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ProgressMessage>) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.type !== "mrflynnib-assignment-progress" || message.assignmentId !== assignmentId) return;
      if (Number(message.total) !== total) return;
      setProgress({
        answered: safeCount(message.answered, total),
        completed: safeCount(message.completed, total),
        correct: safeCount(message.correct, total),
      });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [assignmentId, total]);

  return progress;
}

export function AssignmentHeroProgress({ assignmentId, initialAnswered, initialCompleted, total }: {
  assignmentId: string;
  initialAnswered: number;
  initialCompleted: number;
  total: number;
}) {
  const progress = useAssignmentProgress(assignmentId, total, {
    answered: initialAnswered,
    completed: initialCompleted,
    correct: 0,
  });

  return <div className="teacher-workspace-stats"><span><strong>{progress.completed}/{total}</strong> completed</span><span><strong>{progress.answered}</strong> answers</span></div>;
}

export function AssignmentStatusBar({ assignmentId, dueLabel, initialAnswered, initialCompleted, initialCorrect, isSubmitted, total }: {
  assignmentId: string;
  dueLabel: string;
  initialAnswered: number;
  initialCompleted: number;
  initialCorrect: number;
  isSubmitted: boolean;
  total: number;
}) {
  const progress = useAssignmentProgress(assignmentId, total, {
    answered: initialAnswered,
    completed: initialCompleted,
    correct: initialCorrect,
  });
  const confirmation = progress.completed < total
    ? `You have completed ${progress.completed} of ${total} questions. Are you sure you want to submit this assignment? You will not be able to change your answers or whiteboard working unless your teacher returns it to you.`
    : "Are you sure you want to submit this assignment? You will not be able to change your answers or whiteboard working unless your teacher returns it to you.";

  return <div className="assignment-status-bar">
    <div><span>Your progress</span><strong>{progress.completed} of {total} questions completed</strong></div>
    <div className="dashboard-progress"><span style={{ width: `${total ? Math.round(progress.completed / total * 100) : 0}%` }} /></div>
    <div><span>Answers saved</span><strong>{progress.answered} of {total}{progress.correct ? ` · ${progress.correct} correct` : ""}</strong></div>
    <div><span>Due</span><strong>{dueLabel}</strong></div>
    {isSubmitted
      ? <div className="assignment-submitted-status" role="status"><span aria-hidden="true">✓</span><strong>Submitted</strong></div>
      : <form action={submitAssignment}><input name="assignmentId" type="hidden" value={assignmentId} /><ConfirmSubmitButton className="button button-small" confirmation={confirmation} idleLabel="Submit assignment" pendingLabel="Submitting…" /></form>}
  </div>;
}
