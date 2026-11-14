"use client";

import { useActionState, useState } from "react";
import { changeStudentCourse } from "@/app/teacher/student-course-actions";
import { productsForCurriculum } from "@/lib/platform-products";

export function AdminCourseForm({ accountId, currentCourse, name }: { accountId: string; currentCourse: string; name: string }) {
  const [state, action, pending] = useActionState(changeStudentCourse, { error: "" });
  const [selectedCourse, setSelectedCourse] = useState(currentCourse);
  return <form action={action} className="stack" onReset={(event) => event.preventDefault()}>
    <input type="hidden" name="accountId" value={accountId} />
    <input type="hidden" name="expectedCourse" value={currentCourse} />
    <label>New course
      <select name="courseId" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} required disabled={pending}>
        {!currentCourse ? <option value="">Choose a course</option> : null}
        {productsForCurriculum("ib").map((course) => <option key={course.id} value={course.id}>{course.shortTitle}</option>)}
      </select>
    </label>
    <p>Any current or scheduled individual Plus access for the old course moves to the new course with the same expiry. Access to other courses stays unchanged. Standard accounts remain Standard.</p>
    <p>Saved progress, whiteboards, assignments and class memberships are kept. Changing course does not move the student into a different class.</p>
    {state.error ? <p role="alert" className="form-message form-error">{state.error}</p> : null}
    <button type="submit" className="button button-primary" disabled={pending} onClick={(event) => {
      const form = event.currentTarget.form!;
      const course = String(new FormData(form).get("courseId") || "");
      if (!course || course === currentCourse) return;
      if (!window.confirm(`Change ${name} to ${course.toUpperCase().replace("-", " ")}? Existing work will be kept and any access moved will keep its expiry date.`)) event.preventDefault();
    }}>{pending ? "Saving…" : "Save course change"}</button>
  </form>;
}
