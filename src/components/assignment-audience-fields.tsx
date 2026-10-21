"use client";

import { useEffect, useState } from "react";

type AssignmentAudienceStudent = {
  id: string;
  name: string;
};

type AssignmentAudienceFieldsProps = {
  draftId: string;
  students: AssignmentAudienceStudent[];
  initialRecipientIds?: string[];
};

export function AssignmentAudienceFields({ draftId, students, initialRecipientIds = [] }: AssignmentAudienceFieldsProps) {
  const storageKey = `mrflynnib-assignment-audience:${draftId}`;
  const initialIds = initialRecipientIds.filter((id) => students.some((student) => student.id === id));
  const [mode, setMode] = useState<"class" | "students">(initialIds.length ? "students" : "class");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || "null") as { mode?: string; selectedIds?: unknown } | null;
      if (!saved) return;
      const availableIds = new Set(students.map((student) => student.id));
      const restoredIds = Array.isArray(saved.selectedIds) ? saved.selectedIds.map(String).filter((id) => availableIds.has(id)) : [];
      const restoreDraft = window.setTimeout(() => {
        setSelectedIds(restoredIds);
        setMode(saved.mode === "students" && students.length ? "students" : "class");
      }, 0);
      return () => window.clearTimeout(restoreDraft);
    } catch {
      // Draft saving is a convenience. The form remains usable if browser storage is unavailable.
    }
  }, [storageKey, students]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ mode, selectedIds }));
    } catch {
      // Draft saving is a convenience. The form remains usable if browser storage is unavailable.
    }
  }, [mode, selectedIds, storageKey]);

  function toggleStudent(studentId: string) {
    setSelectedIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  }

  return (
    <fieldset className="assignment-audience-card">
      <legend>Who should receive this task?</legend>
      <p>Choose the whole class, or set the task only for particular students.</p>
      <div className="assignment-audience-options">
        <label className="assignment-audience-option">
          <input checked={mode === "class"} name="recipientMode" onChange={() => setMode("class")} type="radio" value="class" />
          <span><strong>Whole class</strong><small>Current students and anyone who joins this class later.</small></span>
        </label>
        <label className="assignment-audience-option">
          <input checked={mode === "students"} disabled={!students.length} name="recipientMode" onChange={() => setMode("students")} type="radio" value="students" />
          <span><strong>Selected students</strong><small>{students.length ? "Only the students you choose below." : "No students have joined this class yet."}</small></span>
        </label>
      </div>
      {mode === "students" ? (
        <div className="assignment-recipient-picker">
          <div className="assignment-recipient-toolbar">
            <span><strong>{selectedIds.length}</strong> of {students.length} selected</span>
            <span><button onClick={() => setSelectedIds(students.map((student) => student.id))} type="button">Select all</button><button onClick={() => setSelectedIds([])} type="button">Clear</button></span>
          </div>
          <div className="assignment-recipient-list">
            {students.map((student) => <label key={student.id}><input checked={selectedIds.includes(student.id)} name="recipientIds" onChange={() => toggleStudent(student.id)} type="checkbox" value={student.id} /><span className="student-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><strong>{student.name}</strong></label>)}
          </div>
          {!selectedIds.length ? <p className="assignment-recipient-warning">Choose at least one student before publishing.</p> : null}
        </div>
      ) : null}
    </fieldset>
  );
}
