"use client";

import { returnAssignmentToStudent } from "@/app/teacher/actions";

export function ReturnAssignmentForm({ assignmentId, studentId, studentName }: { assignmentId: string; studentId: string; studentName: string }) {
  return <form
    action={returnAssignmentToStudent}
    onSubmit={(event) => {
      if (!window.confirm(`Return this assignment to ${studentName}? Their saved answers and working will be kept, and they will be able to continue and submit again.`)) {
        event.preventDefault();
      }
    }}
  >
    <input name="assignmentId" type="hidden" value={assignmentId} />
    <input name="studentId" type="hidden" value={studentId} />
    <button className="button button-secondary button-small" type="submit">Return to student</button>
  </form>;
}
