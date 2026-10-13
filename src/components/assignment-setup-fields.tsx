"use client";

import { useEffect, useRef } from "react";
import { assignmentFeedbackOptions, isAssignmentFeedbackMode } from "@/lib/assignment-feedback";

type AssignmentSetupDraft = {
  title: string;
  dueDate: string;
  instructions: string;
  feedbackMode: string;
};

export function AssignmentSetupFields({ draftId }: { draftId: string }) {
  const fieldsRef = useRef<HTMLDivElement>(null);
  const storageKey = `mrflynnib-assignment-setup:${draftId}`;

  useEffect(() => {
    const fields = fieldsRef.current;
    if (!fields) return;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || "null") as Partial<AssignmentSetupDraft> | null;
      if (!saved) return;
      const title = fields.querySelector<HTMLInputElement>('input[name="title"]');
      const dueDate = fields.querySelector<HTMLInputElement>('input[name="dueDate"]');
      const instructions = fields.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]');
      const feedbackMode = typeof saved.feedbackMode === "string" && isAssignmentFeedbackMode(saved.feedbackMode) ? saved.feedbackMode : "after_question";
      if (title) title.value = String(saved.title || "").slice(0, 120);
      if (dueDate) dueDate.value = String(saved.dueDate || "").slice(0, 10);
      if (instructions) instructions.value = String(saved.instructions || "").slice(0, 1500);
      fields.querySelectorAll<HTMLInputElement>('input[name="feedbackMode"]').forEach((input) => { input.checked = input.value === feedbackMode; });
    } catch {
      // Draft saving is a convenience. The form remains usable if browser storage is unavailable.
    }
  }, [storageKey]);

  function saveDraft() {
    const fields = fieldsRef.current;
    if (!fields) return;
    const title = fields.querySelector<HTMLInputElement>('input[name="title"]')?.value || "";
    const dueDate = fields.querySelector<HTMLInputElement>('input[name="dueDate"]')?.value || "";
    const instructions = fields.querySelector<HTMLTextAreaElement>('textarea[name="instructions"]')?.value || "";
    const feedbackMode = fields.querySelector<HTMLInputElement>('input[name="feedbackMode"]:checked')?.value || "after_question";
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ title, dueDate, instructions, feedbackMode } satisfies AssignmentSetupDraft));
    } catch {
      // Draft saving is a convenience. The form remains usable if browser storage is unavailable.
    }
  }

  return (
    <div className="assignment-setup-card form-grid" onChange={saveDraft} ref={fieldsRef}>
      <label className="field"><span>Assignment title</span><input name="title" placeholder="Functions practice" maxLength={120} required /></label>
      <label className="field"><span>Due date <small className="muted">(optional)</small></span><input name="dueDate" type="date" /></label>
      <label className="field field-full"><span>Instructions <small className="muted">(optional)</small></span><textarea name="instructions" maxLength={1500} placeholder="Complete the questions and show your working on the whiteboard or paper." /></label>
      <fieldset className="assignment-feedback-settings field-full"><legend>Mark schemes and worked solutions</legend><p>Choose when students can open the complete feedback for each question. You can change this after publishing.</p><div className="assignment-feedback-options">{assignmentFeedbackOptions.map((option) => <label className="assignment-feedback-option" key={option.value}><input name="feedbackMode" type="radio" value={option.value} defaultChecked={option.value === "after_question"} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</div></fieldset>
    </div>
  );
}
