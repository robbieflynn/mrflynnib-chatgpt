import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAssignment, updateAssignmentFeedbackMode } from "@/app/teacher/actions";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { assignmentFeedbackModeFromRecord, assignmentFeedbackOptions } from "@/lib/assignment-feedback";
import { AssignmentDraftClearer } from "@/components/assignment-draft-clearer";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type MatrixState = "correct" | "retry" | "try-again" | "incorrect" | "review" | "legacy" | "attempted" | "empty";

type AssignmentQuestion = {
  question_id: string;
  title_snapshot: string;
  topic_snapshot: string;
  position: number;
  response_type: string;
  response_options: unknown;
};

type AssignmentResponse = {
  student_id: string;
  question_id: string;
  response: unknown;
  is_correct: boolean | null;
  attempt_count: number;
};

type MatrixColumn = {
  questionId: string;
  questionIndex: number;
  partLabel: string | null;
};

const matrixLabels: Record<MatrixState, string> = {
  correct: "Correct first time",
  retry: "Correct after another attempt",
  "try-again": "Another attempt available",
  incorrect: "Needs attention",
  review: "Awaiting teacher review",
  legacy: "Part detail unavailable for this older result",
  attempted: "Attempted without a saved answer",
  empty: "Not attempted",
};

const matrixSymbols: Record<MatrixState, string> = {
  correct: "✓",
  retry: "✓",
  "try-again": "↻",
  incorrect: "×",
  review: "…",
  legacy: "—",
  attempted: "·",
  empty: "",
};

function multipartLabels(question: AssignmentQuestion) {
  if (question.response_type !== "multipart" || !Array.isArray(question.response_options)) return [];
  return question.response_options
    .map((option) => option && typeof option === "object" && "label" in option ? String(option.label || "").trim() : "")
    .filter(Boolean);
}

function displayPartLabel(label: string) {
  if (label === "answer") return "Answer";
  return `(${label.replace(/\(/g, ")(")})`;
}

function partState(response: AssignmentResponse | undefined, partLabel: string, completed: boolean): MatrixState {
  if (!response?.response || typeof response.response !== "object") return completed ? "attempted" : "empty";
  const partStates = (response.response as Record<string, unknown>)._partStates;
  if (!partStates || typeof partStates !== "object") return "legacy";
  const savedPart = (partStates as Record<string, unknown>)[partLabel];
  if (!savedPart || typeof savedPart !== "object") return "empty";
  const state = savedPart as Record<string, unknown>;
  if (state.result === "correct") return Number(state.attemptCount || 0) > 1 ? "retry" : "correct";
  if (state.result === "retry") return "try-again";
  if (state.result === "incorrect_final") return "incorrect";
  if (state.result === "saved") return "review";
  return "attempted";
}

export default async function TeacherAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: assignment } = await supabase.from("assignments").select("id,title,instructions,due_at,status,show_mark_scheme,feedback_mode,class_id,classes(id,name,course,bank)").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!assignment) notFound();
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const dashboardHref = classRecord?.bank === "igcse" ? "/igcse/teacher" : "/teacher";
  const [{ data: questions }, { data: memberships }, { data: progress }, { data: submissions }, { data: responses }, { data: recipientRows }] = await Promise.all([
    supabase.from("assignment_questions").select("question_id,title_snapshot,topic_snapshot,position,response_type,response_options").eq("assignment_id", id).order("position"),
    supabase.from("class_memberships").select("student_id,joined_at").eq("class_id", assignment.class_id).order("joined_at"),
    supabase.from("assignment_question_progress").select("student_id,question_id,completed").eq("assignment_id", id).eq("completed", true),
    supabase.from("assignment_submissions").select("student_id,status,submitted_at").eq("assignment_id", id),
    supabase.from("assignment_responses").select("student_id,question_id,response,is_correct,attempt_count").eq("assignment_id", id),
    supabase.from("assignment_recipients").select("student_id").eq("assignment_id", id),
  ]);
  const recipientIds = new Set((recipientRows ?? []).map((recipient) => recipient.student_id));
  const isTargeted = recipientIds.size > 0;
  const assignedMemberships = isTargeted ? (memberships ?? []).filter((membership) => recipientIds.has(membership.student_id)) : (memberships ?? []);
  const studentIds = assignedMemberships.map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  const submitted = new Map((submissions ?? []).map((row) => [row.student_id, row]));
  const progressKeys = new Set((progress ?? []).map((row) => `${row.student_id}:${row.question_id}`));
  const assignmentQuestions = (questions ?? []) as AssignmentQuestion[];
  const assignmentResponses = (responses ?? []) as AssignmentResponse[];
  const responseByCell = new Map(assignmentResponses.map((row) => [`${row.student_id}:${row.question_id}`, row]));

  const stateFor = (studentId: string, questionId: string): MatrixState => {
    const response = responseByCell.get(`${studentId}:${questionId}`);
    if (response?.is_correct === true) return Number(response.attempt_count || 0) > 1 ? "retry" : "correct";
    if (response?.is_correct === false) return "incorrect";
    if (response) return "review";
    if (progressKeys.has(`${studentId}:${questionId}`)) return "attempted";
    return "empty";
  };

  const matrixColumns = assignmentQuestions.flatMap<MatrixColumn>((question, questionIndex) => {
    const labels = multipartLabels(question);
    return labels.length
      ? labels.map((partLabel) => ({ questionId: question.question_id, questionIndex, partLabel }))
      : [{ questionId: question.question_id, questionIndex, partLabel: null }];
  });
  const stateForColumn = (studentId: string, column: MatrixColumn): MatrixState => column.partLabel
    ? partState(
      responseByCell.get(`${studentId}:${column.questionId}`),
      column.partLabel,
      progressKeys.has(`${studentId}:${column.questionId}`),
    )
    : stateFor(studentId, column.questionId);
  const hasMultipartColumns = matrixColumns.some((column) => column.partLabel);

  const total = assignmentQuestions.length;
  const totalParts = matrixColumns.length;
  const submittedCount = (submissions ?? []).filter((item) => item.status === "submitted").length;
  const allStates = assignedMemberships.flatMap((membership) => matrixColumns.map((column) => stateForColumn(membership.student_id, column)));
  const correctCount = allStates.filter((state) => state === "correct" || state === "retry").length;
  const markedCount = allStates.filter((state) => state === "correct" || state === "retry" || state === "incorrect").length;
  const classAccuracy = markedCount ? Math.round(correctCount / markedCount * 100) : null;
  const needsAttention = allStates.filter((state) => state === "incorrect").length;
  const awaitingReview = allStates.filter((state) => state === "review").length;
  const workspaceClass = classRecord?.bank === "igcse" ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  const feedbackMode = assignmentFeedbackModeFromRecord(assignment);

  return <main className={workspaceClass}>
    <AssignmentDraftClearer classId={assignment.class_id} enabled={message.success === "Assignment published."} />
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord?.name || "Class", href: `/teacher/classes/${assignment.class_id}` }, { label: assignment.title }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord?.course}</p><h1>{assignment.title}</h1>{assignment.instructions ? <p>{assignment.instructions}</p> : <p>Review class progress and open any student&apos;s saved answers and working.</p>}</div><div className="teacher-workspace-stats"><span><strong>{total}</strong> questions</span><span><strong>{assignedMemberships.length}</strong> students</span></div></div></Container></section>
    <section className="section-tight"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}

      <div className="assignment-summary-grid">
        <div><span>Submitted</span><strong>{submittedCount}/{assignedMemberships.length}</strong><small>students</small></div>
        <div><span>Class accuracy</span><strong>{classAccuracy === null ? "—" : `${classAccuracy}%`}</strong><small>auto-marked answers</small></div>
        <div><span>Needs attention</span><strong>{needsAttention}</strong><small>answers</small></div>
        <div><span>Awaiting review</span><strong>{awaitingReview}</strong><small>answers</small></div>
        <div><span>Due date</span><strong>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "None"}</strong><small>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { year: "numeric" }) : "No deadline"}</small></div>
      </div>

      <div className="assignment-builder-actions"><p className="muted small">Need a second version for practice or recovery? Create a new task with the same question pattern and different questions.</p><Link className="button button-secondary" href={`/teacher/classes/${assignment.class_id}/assignments/new?shadowOf=${encodeURIComponent(id)}`}>Create shadow task</Link></div>

      <div className="assignment-management-row"><div><strong>Task audience</strong><small>{isTargeted ? `${assignedMemberships.length} selected ${assignedMemberships.length === 1 ? "student" : "students"}` : "Whole class, including students who join later"}</small></div><form action={deleteAssignment}><input name="assignmentId" type="hidden" value={id} /><ConfirmSubmitButton className="button button-danger button-small" confirmation={`Delete “${assignment.title}”? This permanently removes the task, its submissions, saved answers and assignment-specific whiteboard copies. This cannot be undone.`} idleLabel="Delete task" pendingLabel="Deleting…" /></form></div>

      <form action={updateAssignmentFeedbackMode} className="mark-scheme-setting mark-scheme-policy"><div><span className={`visibility-dot ${feedbackMode !== "hidden" ? "is-visible" : ""}`} aria-hidden="true" /><span><strong>Mark schemes and worked solutions</strong><small>Control exactly when students can open the complete feedback.</small></span></div><input name="assignmentId" type="hidden" value={id} /><label><span>Student access</span><select name="feedbackMode" defaultValue={feedbackMode}>{assignmentFeedbackOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button button-secondary button-small" type="submit">Save setting</button></form>

      <section className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Full breakdown</p><h2>Student-by-question overview</h2></div><p>Each square shows the latest result. Select one to review that student&apos;s answer and working.</p></div>
        <div className="assignment-matrix-legend" aria-label="Results key"><span className="is-correct">✓ Correct first time</span><span className="is-retry">✓ Correct after retry</span><span className="is-try-again">↻ Another attempt available</span><span className="is-incorrect">× Needs attention</span><span className="is-review">… Awaiting review</span><span className="is-legacy">— Older result without part detail</span><span className="is-empty">Not attempted</span></div>
        {assignedMemberships.length && assignmentQuestions.length ? <div className="assignment-matrix-scroll"><table className="assignment-matrix"><thead>{hasMultipartColumns ? <><tr><th className="assignment-matrix-student" rowSpan={2}>Student</th>{assignmentQuestions.map((question, index) => { const labels = multipartLabels(question); return <th colSpan={Math.max(1, labels.length)} key={question.question_id} title={`${question.title_snapshot || `Question ${index + 1}`} · ${question.topic_snapshot}`}><span>Q{index + 1}</span><small>{question.response_type === "teacher_review" ? "Review" : "Auto"}</small></th>; })}<th className="assignment-matrix-total" rowSpan={2}>Progress</th></tr><tr className="assignment-matrix-parts">{matrixColumns.map((column) => <th key={`${column.questionId}:${column.partLabel || "answer"}`}><span>{column.partLabel ? displayPartLabel(column.partLabel) : "Answer"}</span></th>)}</tr></> : <tr><th className="assignment-matrix-student">Student</th>{assignmentQuestions.map((question, index) => <th key={question.question_id} title={`${question.title_snapshot || `Question ${index + 1}`} · ${question.topic_snapshot}`}><span>Q{index + 1}</span><small>{question.response_type === "teacher_review" ? "Review" : "Auto"}</small></th>)}<th className="assignment-matrix-total">Progress</th></tr>}</thead><tbody>
          {assignedMemberships.map((membership) => {
            const states = matrixColumns.map((column) => stateForColumn(membership.student_id, column));
            const attempted = states.filter((state) => state !== "empty").length;
            const record = submitted.get(membership.student_id);
            return <tr key={membership.student_id}><th className="assignment-matrix-student"><Link href={`/teacher/assignments/${id}/students/${membership.student_id}`}><strong>{names.get(membership.student_id) || "Student"}</strong><small>{record?.status === "submitted" ? "Submitted" : attempted ? "In progress" : "Not started"}</small></Link></th>{matrixColumns.map((column, index) => { const state = states[index]; const label = matrixLabels[state]; const partCopy = column.partLabel ? `, part ${displayPartLabel(column.partLabel)}` : ""; return <td key={`${column.questionId}:${column.partLabel || "answer"}`}><Link className={`matrix-cell is-${state}`} href={`/teacher/assignments/${id}/students/${membership.student_id}?question=${encodeURIComponent(column.questionId)}`} title={`Question ${column.questionIndex + 1}${partCopy}: ${label}`} aria-label={`${names.get(membership.student_id) || "Student"}, question ${column.questionIndex + 1}${partCopy}: ${label}`}>{matrixSymbols[state]}</Link></td>; })}<td className="assignment-matrix-total"><strong>{attempted}/{totalParts}</strong><small>{totalParts ? `${Math.round(attempted / totalParts * 100)}%` : "0%"}</small></td></tr>;
          })}
        </tbody></table></div> : <div className="dashboard-empty-state"><span aria-hidden="true">#</span><div><strong>{!assignedMemberships.length ? "No assigned students are in this class" : "This assignment has no questions"}</strong><p>{!assignedMemberships.length ? "Set a new task for the whole class or choose current students." : "Return to the class and set a new assignment."}</p></div></div>}
      </section>

      <section className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">By question</p><h2>Where the class needs help</h2></div><p>Use this list to spot questions that need reteaching or individual follow-up.</p></div><div className="teacher-question-list">{assignmentQuestions.map((question, index) => {
        const questionColumns = matrixColumns.filter((column) => column.questionId === question.question_id);
        const states = assignedMemberships.flatMap((membership) => questionColumns.map((column) => stateForColumn(membership.student_id, column)));
        const correct = states.filter((state) => state === "correct" || state === "retry").length;
        const incorrect = states.filter((state) => state === "incorrect").length;
        const review = states.filter((state) => state === "review" || state === "try-again" || state === "legacy").length;
        const resultNoun = questionColumns.length > 1 ? "parts" : "answers";
        return <div className="teacher-question-row" key={question.question_id}><span className="teacher-question-number">{index + 1}</span><span className="teacher-question-copy"><strong>{question.title_snapshot || `Question ${index + 1}`}</strong><small>{question.topic_snapshot}{questionColumns.length > 1 ? ` · ${questionColumns.length} parts` : ""}</small></span><span className="teacher-question-results">{correct ? <span className="question-result is-correct">{correct} correct {resultNoun}</span> : null}{incorrect ? <span className="question-result is-incorrect">{incorrect} need attention</span> : null}{review ? <span className="question-result is-review">{review} still in progress, older, or awaiting review</span> : null}{!states.some((state) => state !== "empty") ? <span className="question-result is-empty">Not attempted</span> : null}</span></div>;
      })}</div></section>
    </Container></section>
  </main>;
}
