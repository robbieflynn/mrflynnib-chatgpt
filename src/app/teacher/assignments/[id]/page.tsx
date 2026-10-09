import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAssignmentFeedbackMode } from "@/app/teacher/actions";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { assignmentFeedbackModeFromRecord, assignmentFeedbackOptions } from "@/lib/assignment-feedback";

type MatrixState = "correct" | "retry" | "incorrect" | "review" | "attempted" | "empty";

const matrixLabels: Record<MatrixState, string> = {
  correct: "Correct first time",
  retry: "Correct after another attempt",
  incorrect: "Needs attention",
  review: "Awaiting teacher review",
  attempted: "Attempted without a saved answer",
  empty: "Not attempted",
};

const matrixSymbols: Record<MatrixState, string> = {
  correct: "✓",
  retry: "✓",
  incorrect: "×",
  review: "…",
  attempted: "·",
  empty: "",
};

export default async function TeacherAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: assignment } = await supabase.from("assignments").select("id,title,instructions,due_at,status,show_mark_scheme,feedback_mode,class_id,classes(id,name,course,bank)").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!assignment) notFound();
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const dashboardHref = classRecord?.bank === "igcse" ? "/igcse/teacher" : "/teacher";
  const [{ data: questions }, { data: memberships }, { data: progress }, { data: submissions }, { data: responses }] = await Promise.all([
    supabase.from("assignment_questions").select("question_id,title_snapshot,topic_snapshot,position,response_type").eq("assignment_id", id).order("position"),
    supabase.from("class_memberships").select("student_id,joined_at").eq("class_id", assignment.class_id).order("joined_at"),
    supabase.from("assignment_question_progress").select("student_id,question_id,completed").eq("assignment_id", id).eq("completed", true),
    supabase.from("assignment_submissions").select("student_id,status,submitted_at").eq("assignment_id", id),
    supabase.from("assignment_responses").select("student_id,question_id,is_correct,attempt_count").eq("assignment_id", id),
  ]);
  const studentIds = (memberships ?? []).map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  const submitted = new Map((submissions ?? []).map((row) => [row.student_id, row]));
  const progressKeys = new Set((progress ?? []).map((row) => `${row.student_id}:${row.question_id}`));
  const responseByCell = new Map((responses ?? []).map((row) => [`${row.student_id}:${row.question_id}`, row]));

  const stateFor = (studentId: string, questionId: string): MatrixState => {
    const response = responseByCell.get(`${studentId}:${questionId}`);
    if (response?.is_correct === true) return Number(response.attempt_count || 0) > 1 ? "retry" : "correct";
    if (response?.is_correct === false) return "incorrect";
    if (response) return "review";
    if (progressKeys.has(`${studentId}:${questionId}`)) return "attempted";
    return "empty";
  };

  const total = questions?.length ?? 0;
  const submittedCount = (submissions ?? []).filter((item) => item.status === "submitted").length;
  const allStates = (memberships ?? []).flatMap((membership) => (questions ?? []).map((question) => stateFor(membership.student_id, question.question_id)));
  const correctCount = allStates.filter((state) => state === "correct" || state === "retry").length;
  const markedCount = allStates.filter((state) => state === "correct" || state === "retry" || state === "incorrect").length;
  const classAccuracy = markedCount ? Math.round(correctCount / markedCount * 100) : null;
  const needsAttention = allStates.filter((state) => state === "incorrect").length;
  const awaitingReview = allStates.filter((state) => state === "review").length;
  const workspaceClass = classRecord?.bank === "igcse" ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  const feedbackMode = assignmentFeedbackModeFromRecord(assignment);

  return <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord?.name || "Class", href: `/teacher/classes/${assignment.class_id}` }, { label: assignment.title }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord?.course}</p><h1>{assignment.title}</h1>{assignment.instructions ? <p>{assignment.instructions}</p> : <p>Review class progress and open any student&apos;s saved answers and working.</p>}</div><div className="teacher-workspace-stats"><span><strong>{total}</strong> questions</span><span><strong>{memberships?.length ?? 0}</strong> students</span></div></div></Container></section>
    <section className="section-tight"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}

      <div className="assignment-summary-grid">
        <div><span>Submitted</span><strong>{submittedCount}/{memberships?.length ?? 0}</strong><small>students</small></div>
        <div><span>Class accuracy</span><strong>{classAccuracy === null ? "—" : `${classAccuracy}%`}</strong><small>auto-marked answers</small></div>
        <div><span>Needs attention</span><strong>{needsAttention}</strong><small>answers</small></div>
        <div><span>Awaiting review</span><strong>{awaitingReview}</strong><small>answers</small></div>
        <div><span>Due date</span><strong>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "None"}</strong><small>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { year: "numeric" }) : "No deadline"}</small></div>
      </div>

      <form action={updateAssignmentFeedbackMode} className="mark-scheme-setting mark-scheme-policy"><div><span className={`visibility-dot ${feedbackMode !== "hidden" ? "is-visible" : ""}`} aria-hidden="true" /><span><strong>Mark schemes and worked solutions</strong><small>Control exactly when students can open the complete feedback.</small></span></div><input name="assignmentId" type="hidden" value={id} /><label><span>Student access</span><select name="feedbackMode" defaultValue={feedbackMode}>{assignmentFeedbackOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button button-secondary button-small" type="submit">Save setting</button></form>

      <section className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Full breakdown</p><h2>Student-by-question overview</h2></div><p>Each square shows the latest result. Select one to review that student&apos;s answer and working.</p></div>
        <div className="assignment-matrix-legend" aria-label="Results key"><span className="is-correct">✓ Correct first time</span><span className="is-retry">✓ Correct after retry</span><span className="is-incorrect">× Needs attention</span><span className="is-review">… Awaiting review</span><span className="is-empty">Not attempted</span></div>
        {memberships?.length && questions?.length ? <div className="assignment-matrix-scroll"><table className="assignment-matrix"><thead><tr><th className="assignment-matrix-student">Student</th>{questions.map((question, index) => <th key={question.question_id} title={`${question.title_snapshot || `Question ${index + 1}`} · ${question.topic_snapshot}`}><span>Q{index + 1}</span><small>{question.response_type === "teacher_review" ? "Review" : "Auto"}</small></th>)}<th className="assignment-matrix-total">Progress</th></tr></thead><tbody>
          {memberships.map((membership) => {
            const states = (questions ?? []).map((question) => stateFor(membership.student_id, question.question_id));
            const attempted = states.filter((state) => state !== "empty").length;
            const record = submitted.get(membership.student_id);
            return <tr key={membership.student_id}><th className="assignment-matrix-student"><Link href={`/teacher/assignments/${id}/students/${membership.student_id}`}><strong>{names.get(membership.student_id) || "Student"}</strong><small>{record?.status === "submitted" ? "Submitted" : attempted ? "In progress" : "Not started"}</small></Link></th>{(questions ?? []).map((question, index) => { const state = states[index]; const label = matrixLabels[state]; return <td key={question.question_id}><Link className={`matrix-cell is-${state}`} href={`/teacher/assignments/${id}/students/${membership.student_id}?question=${encodeURIComponent(question.question_id)}`} title={`Question ${index + 1}: ${label}`} aria-label={`${names.get(membership.student_id) || "Student"}, question ${index + 1}: ${label}`}>{matrixSymbols[state]}</Link></td>; })}<td className="assignment-matrix-total"><strong>{attempted}/{total}</strong><small>{total ? `${Math.round(attempted / total * 100)}%` : "0%"}</small></td></tr>;
          })}
        </tbody></table></div> : <div className="dashboard-empty-state"><span aria-hidden="true">#</span><div><strong>{!memberships?.length ? "No students have joined yet" : "This assignment has no questions"}</strong><p>{!memberships?.length ? "Share the class joining code to begin tracking progress." : "Return to the class and set a new assignment."}</p></div></div>}
      </section>

      <section className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">By question</p><h2>Where the class needs help</h2></div><p>Use this list to spot questions that need reteaching or individual follow-up.</p></div><div className="teacher-question-list">{(questions ?? []).map((question, index) => {
        const states = (memberships ?? []).map((membership) => stateFor(membership.student_id, question.question_id));
        const correct = states.filter((state) => state === "correct" || state === "retry").length;
        const incorrect = states.filter((state) => state === "incorrect").length;
        const review = states.filter((state) => state === "review").length;
        return <div className="teacher-question-row" key={question.question_id}><span className="teacher-question-number">{index + 1}</span><span className="teacher-question-copy"><strong>{question.title_snapshot || `Question ${index + 1}`}</strong><small>{question.topic_snapshot}</small></span><span className="teacher-question-results">{correct ? <span className="question-result is-correct">{correct} correct</span> : null}{incorrect ? <span className="question-result is-incorrect">{incorrect} needs attention</span> : null}{review ? <span className="question-result is-review">{review} awaiting review</span> : null}{!states.some((state) => state !== "empty") ? <span className="question-result is-empty">Not attempted</span> : null}</span></div>;
      })}</div></section>
    </Container></section>
  </main>;
}
