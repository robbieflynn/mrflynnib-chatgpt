import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { ClassInviteLink } from "@/components/class-invite-link";
import { requireTeacher } from "@/lib/account-access";

type ClassAssignmentQuestion = {
  assignment_id: string;
  question_id: string;
  response_type: string;
  response_options: unknown;
};

type ClassAssignmentResponse = {
  assignment_id: string;
  student_id: string;
  question_id: string;
  response: unknown;
  is_correct: boolean | null;
};

type ClassAssignmentSubmission = {
  assignment_id: string;
  student_id: string;
  status: string;
};

type PerformanceResult = {
  percentage: number | null;
  status: "not-assigned" | "not-started" | "in-progress" | "submitted" | "review";
  detail: string;
};

function multipartLabels(question: ClassAssignmentQuestion) {
  if (question.response_type !== "multipart" || !Array.isArray(question.response_options)) return [];
  return question.response_options
    .map((option) => option && typeof option === "object" && "label" in option ? String(option.label || "").trim() : "")
    .filter(Boolean);
}

function partResult(response: ClassAssignmentResponse | undefined, partLabel: string) {
  if (!response?.response || typeof response.response !== "object") return null;
  const partStates = (response.response as Record<string, unknown>)._partStates;
  if (!partStates || typeof partStates !== "object") return null;
  const part = (partStates as Record<string, unknown>)[partLabel];
  if (!part || typeof part !== "object") return null;
  const result = String((part as Record<string, unknown>).result || "");
  if (result === "correct") return true;
  if (result === "incorrect_final") return false;
  return null;
}

function performanceTone(percentage: number) {
  if (percentage > 70) return "strong";
  if (percentage >= 32) return "developing";
  return "attention";
}

export default async function TeacherClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: classRecord } = await supabase.from("classes").select("id,name,course,join_code").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) notFound();
  const dashboardHref = classRecord.course === "IGCSE Higher" ? "/igcse/teacher" : "/teacher";
  const [membershipResult, assignmentResult] = await Promise.all([
    supabase.from("class_memberships").select("student_id,joined_at").eq("class_id", id).order("joined_at"),
    supabase.from("assignments").select("id,title,due_at,status,created_at").eq("class_id", id).order("created_at", { ascending: false }),
  ]);
  const memberships = membershipResult.data ?? [];
  const assignments = assignmentResult.data ?? [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const [questionRows, submissionRows, responseRows, recipientRows] = assignmentIds.length
    ? await Promise.all([
      supabase.from("assignment_questions").select("assignment_id,question_id,response_type,response_options").in("assignment_id", assignmentIds),
      supabase.from("assignment_submissions").select("assignment_id,student_id,status").in("assignment_id", assignmentIds),
      supabase.from("assignment_responses").select("assignment_id,student_id,question_id,response,is_correct").in("assignment_id", assignmentIds),
      supabase.from("assignment_recipients").select("assignment_id,student_id").in("assignment_id", assignmentIds),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
  const questionCountByAssignment = new Map<string, number>();
  (questionRows.data ?? []).forEach((row) => questionCountByAssignment.set(row.assignment_id, (questionCountByAssignment.get(row.assignment_id) || 0) + 1));
  const submittedCountByAssignment = new Map<string, number>();
  (submissionRows.data ?? []).forEach((row) => {
    if (row.status === "submitted") submittedCountByAssignment.set(row.assignment_id, (submittedCountByAssignment.get(row.assignment_id) || 0) + 1);
  });
  const assignmentLoadError = assignmentResult.error || questionRows.error || submissionRows.error || responseRows.error || recipientRows.error;
  const studentIds = (memberships ?? []).map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const studentNames = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  const recipientsByAssignment = new Map<string, Set<string>>();
  (recipientRows.data ?? []).forEach((recipient) => {
    const existing = recipientsByAssignment.get(recipient.assignment_id) ?? new Set<string>();
    existing.add(recipient.student_id);
    recipientsByAssignment.set(recipient.assignment_id, existing);
  });
  const isAssignedTo = (assignmentId: string, studentId: string) => {
    const recipients = recipientsByAssignment.get(assignmentId);
    return !recipients?.size || recipients.has(studentId);
  };
  const assignedStudentCount = (assignmentId: string) => recipientsByAssignment.get(assignmentId)?.size || memberships.length;
  const performanceAssignments = [...assignments].reverse();
  const questionsByAssignment = new Map<string, ClassAssignmentQuestion[]>();
  ((questionRows.data ?? []) as ClassAssignmentQuestion[]).forEach((question) => {
    const existing = questionsByAssignment.get(question.assignment_id) ?? [];
    existing.push(question);
    questionsByAssignment.set(question.assignment_id, existing);
  });
  const responseByCell = new Map<string, ClassAssignmentResponse>();
  ((responseRows.data ?? []) as ClassAssignmentResponse[]).forEach((response) => {
    responseByCell.set(`${response.assignment_id}:${response.student_id}:${response.question_id}`, response);
  });
  const submissionByCell = new Map<string, ClassAssignmentSubmission>();
  ((submissionRows.data ?? []) as ClassAssignmentSubmission[]).forEach((submission) => {
    submissionByCell.set(`${submission.assignment_id}:${submission.student_id}`, submission);
  });
  const performanceFor = (assignmentId: string, studentId: string): PerformanceResult => {
    if (!isAssignedTo(assignmentId, studentId)) return { percentage: null, status: "not-assigned", detail: "Not assigned" };
    const submission = submissionByCell.get(`${assignmentId}:${studentId}`);
    const questions = questionsByAssignment.get(assignmentId) ?? [];
    let correct = 0;
    let marked = 0;
    let responses = 0;
    questions.forEach((question) => {
      const response = responseByCell.get(`${assignmentId}:${studentId}:${question.question_id}`);
      if (!response) return;
      responses += 1;
      const labels = multipartLabels(question);
      if (labels.length) {
        let hasPartResult = false;
        labels.forEach((label) => {
          const result = partResult(response, label);
          if (result === null) return;
          hasPartResult = true;
          marked += 1;
          if (result) correct += 1;
        });
        if (!hasPartResult && response.is_correct !== null) {
          marked += 1;
          if (response.is_correct) correct += 1;
        }
      } else if (response.is_correct !== null) {
        marked += 1;
        if (response.is_correct) correct += 1;
      }
    });
    if (!submission && !responses) return { percentage: null, status: "not-started", detail: "Not started" };
    if (submission?.status !== "submitted") return { percentage: null, status: "in-progress", detail: "In progress" };
    if (!marked) return { percentage: null, status: "review", detail: "Submitted for review" };
    const percentage = Math.round(correct / marked * 100);
    return { percentage, status: "submitted", detail: `${correct}/${marked} checked answers` };
  };
  const performanceByCell = new Map<string, PerformanceResult>();
  memberships.forEach((membership) => performanceAssignments.forEach((assignment) => {
    performanceByCell.set(`${membership.student_id}:${assignment.id}`, performanceFor(assignment.id, membership.student_id));
  }));
  const assignmentAverage = new Map<string, number | null>();
  performanceAssignments.forEach((assignment) => {
    const values = memberships
      .filter((membership) => isAssignedTo(assignment.id, membership.student_id))
      .map((membership) => performanceByCell.get(`${membership.student_id}:${assignment.id}`)?.percentage)
      .filter((value): value is number => typeof value === "number");
    assignmentAverage.set(assignment.id, values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);
  });
  const isIgcse = classRecord.course === "IGCSE Higher";
  const workspaceClass = isIgcse ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  const invitationUrl = `https://www.mrflynnib.com/join/${encodeURIComponent(classRecord.join_code.trim().toUpperCase())}`;
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord.name }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord.course}</p><h1>{classRecord.name}</h1><p>Set work, monitor progress and review every student&apos;s answers and working.</p></div><div className="teacher-workspace-stats" aria-label="Class summary"><span><strong>{memberships.length}</strong> students</span><span><strong>{assignments.length}</strong> assignments</span></div></div></Container></section>
    <section className="section-tight"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="class-toolbar"><div className="class-code"><span>Invite students</span><strong>{classRecord.join_code}</strong><small>Share the invitation link or ask students to enter this code on their dashboard.</small></div><div className="class-toolbar-actions"><ClassInviteLink invitationUrl={invitationUrl} /><Link className="button" href={`/teacher/classes/${id}/assignments/new`}>Set an assignment</Link></div></div>
      <section className="stack" aria-labelledby="class-performance-heading">
        <div className="teacher-section-heading"><div><p className="eyebrow">Assignment history</p><h2 id="class-performance-heading">Class performance</h2></div><p>Compare completed assignments across the class. Select any result to open that student&apos;s work.</p></div>
        <div className="class-performance-legend" aria-label="Performance key"><span className="is-strong">Strong</span><span className="is-developing">Developing</span><span className="is-attention">Needs attention</span><span className="is-progress">In progress</span><span className="is-review">Submitted for review</span></div>
        {memberships.length && performanceAssignments.length ? <div className="class-performance-scroll"><table className="class-performance-table"><thead><tr><th className="class-performance-student">Student</th>{performanceAssignments.map((assignment) => <th key={assignment.id}><Link href={`/teacher/assignments/${assignment.id}`} title={assignment.title}><strong>{assignment.title}</strong><small>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No due date"}</small></Link></th>)}<th className="class-performance-overall">Overall</th></tr></thead><tbody>
          {memberships.map((membership) => {
            const percentages = performanceAssignments
              .map((assignment) => performanceByCell.get(`${membership.student_id}:${assignment.id}`)?.percentage)
              .filter((value): value is number => typeof value === "number");
            const overall = percentages.length ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : null;
            return <tr key={membership.student_id}><th className="class-performance-student"><span className="class-performance-student-inner"><span className="student-avatar" aria-hidden="true">{(studentNames.get(membership.student_id) || "S").slice(0, 1).toUpperCase()}</span><span><strong>{studentNames.get(membership.student_id) || "Student"}</strong><small>{percentages.length} {percentages.length === 1 ? "result" : "results"}</small></span></span></th>{performanceAssignments.map((assignment) => {
              const result = performanceByCell.get(`${membership.student_id}:${assignment.id}`) ?? { percentage: null, status: "not-started" as const, detail: "Not started" };
              const scoreClass = result.percentage === null ? `is-${result.status}` : `is-${performanceTone(result.percentage)}`;
              return <td key={assignment.id}>{result.status === "not-assigned" ? <span className={`class-performance-score ${scoreClass}`}><strong>—</strong><small>Not assigned</small></span> : <Link className={`class-performance-score ${scoreClass}`} href={`/teacher/assignments/${assignment.id}/students/${membership.student_id}`}><strong>{result.percentage === null ? result.status === "review" ? "Review" : result.status === "in-progress" ? "In progress" : "—" : `${result.percentage}%`}</strong><small>{result.detail}</small></Link>}</td>;
            })}<td className="class-performance-overall"><strong>{overall === null ? "—" : `${overall}%`}</strong><small>{overall === null ? "No completed scores" : `${percentages.length} completed`}</small></td></tr>;
          })}
          <tr className="class-performance-average"><th className="class-performance-student"><span className="class-performance-student-inner"><span><strong>Class average</strong><small>Completed scored work</small></span></span></th>{performanceAssignments.map((assignment) => { const average = assignmentAverage.get(assignment.id); return <td key={assignment.id}><Link href={`/teacher/assignments/${assignment.id}`}><strong>{average == null ? "—" : `${average}%`}</strong><small>{average == null ? "No scored submissions" : "Open assignment"}</small></Link></td>; })}<td className="class-performance-overall"><strong>—</strong></td></tr>
        </tbody></table></div> : <div className="dashboard-empty-state compact"><span aria-hidden="true">%</span><div><strong>{!memberships.length ? "No students have joined yet" : "No assignments yet"}</strong><p>{!memberships.length ? "Share the invitation link to begin tracking class performance." : "Set the first assignment and its results will appear here."}</p></div></div>}
      </section>
      <div className="teacher-two-column">
        <div className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Classwork</p><h2>Assignments</h2></div><p>Open an assignment to see progress by student and by question.</p></div>
          {assignmentLoadError ? <p className="form-message form-error">The assignments could not be refreshed just now. Please reload the page.</p> : null}
          <div className="teacher-list">
            {assignments.map((assignment) => <Link className="teacher-list-row teacher-assignment-row" href={`/teacher/assignments/${assignment.id}`} key={assignment.id}><span><strong>{assignment.title}</strong><small>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No due date"} · {recipientsByAssignment.get(assignment.id)?.size ? `${assignedStudentCount(assignment.id)} selected` : "Whole class"}</small></span><span className="teacher-list-meta"><strong>{questionCountByAssignment.get(assignment.id) || 0}</strong> questions</span><span className="teacher-list-meta"><strong>{submittedCountByAssignment.get(assignment.id) || 0}/{assignedStudentCount(assignment.id)}</strong> submitted</span><span className="teacher-row-arrow" aria-hidden="true">→</span></Link>)}
            {!assignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><span aria-hidden="true">＋</span><div><strong>No assignments yet</strong><p>Set the first piece of work for this class.</p></div></div> : null}
          </div>
        </div>
        <aside className="teacher-students-panel stack"><div className="teacher-section-heading teacher-roster-heading"><div><p className="eyebrow">Students</p><h2>Student roster</h2></div><span className="teacher-panel-count">{memberships.length} joined</span></div><div className="teacher-list">
          {(memberships ?? []).map((membership) => <div className="teacher-list-row teacher-student-row" key={membership.student_id}><span className="student-avatar" aria-hidden="true">{(studentNames.get(membership.student_id) || "S").slice(0, 1).toUpperCase()}</span><span><strong>{studentNames.get(membership.student_id) || "Student"}</strong><small>Joined {new Date(membership.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></span></div>)}
          {!memberships?.length ? <div className="dashboard-empty-state compact"><span aria-hidden="true">#</span><div><strong>No students yet</strong><p>Share the invitation link or joining code above.</p></div></div> : null}
        </div></aside>
      </div>
    </Container></section></main>
  </>;
}
