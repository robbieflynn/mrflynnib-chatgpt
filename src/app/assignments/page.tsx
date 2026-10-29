import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { DashboardIcon } from "@/components/dashboard-icon";
import { Container } from "@/components/ui";
import { requireSignedIn } from "@/lib/account-access";

export const metadata: Metadata = {
  title: "My assignments | Mr Flynn IB",
  description: "View current and past class assignments.",
  robots: { index: false, follow: false },
};

function percentage(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

function dueDateLabel(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const dueDate = new Date(dueAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const daysAway = Math.round((startOfDueDate - startOfToday) / 86_400_000);

  if (daysAway < 0) return `${Math.abs(daysAway)} ${Math.abs(daysAway) === 1 ? "day" : "days"} overdue`;
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  if (daysAway <= 7) return `Due in ${daysAway} days`;
  return `Due ${dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

type AssignmentPageSearchParams = { curriculum?: string | string[] };

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<AssignmentPageSearchParams> }) {
  const pageSearchParams = await searchParams;
  const isIgcse = pageSearchParams.curriculum === "igcse";
  const curriculum = isIgcse ? "igcse" : "ib";
  const learningHome = isIgcse ? "/igcse/account" : "/account";
  const signOutHref = isIgcse ? "/igcse/account" : "/account";
  const { supabase, user } = await requireSignedIn(isIgcse ? "/assignments?curriculum=igcse" : "/assignments", curriculum);
  const { data: memberships, error: membershipError } = await supabase
    .from("class_memberships")
    .select("class_id,classes(id,name,bank)")
    .eq("student_id", user.id);
  const activeMemberships = (memberships ?? []).filter((membership) => {
    const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
    return classRecord?.bank === curriculum;
  });
  const classIds = activeMemberships.map((membership) => membership.class_id);
  const classNames = new Map(activeMemberships.map((membership) => {
    const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
    return [membership.class_id, classRecord?.name || "Class"];
  }));
  const assignmentResult = classIds.length
    ? await supabase.from("assignments").select("id,title,due_at,class_id,created_at").in("class_id", classIds).eq("status", "published").order("created_at", { ascending: false })
    : { data: [], error: null };
  const assignments = assignmentResult.data ?? [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const [questionRows, progressRows, submissionRows] = assignmentIds.length
    ? await Promise.all([
      supabase.from("assignment_questions").select("assignment_id").in("assignment_id", assignmentIds),
      supabase.from("assignment_question_progress").select("assignment_id").in("assignment_id", assignmentIds).eq("student_id", user.id).eq("completed", true),
      supabase.from("assignment_submissions").select("assignment_id,status,submitted_at").in("assignment_id", assignmentIds).eq("student_id", user.id),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
  const questionCountByAssignment = new Map<string, number>();
  (questionRows.data ?? []).forEach((row) => questionCountByAssignment.set(row.assignment_id, (questionCountByAssignment.get(row.assignment_id) || 0) + 1));
  const progressCountByAssignment = new Map<string, number>();
  (progressRows.data ?? []).forEach((row) => progressCountByAssignment.set(row.assignment_id, (progressCountByAssignment.get(row.assignment_id) || 0) + 1));
  const submissionByAssignment = new Map((submissionRows.data ?? []).map((row) => [row.assignment_id, row]));
  const studentAssignments = assignments.map((assignment) => {
    const questionCount = questionCountByAssignment.get(assignment.id) || 0;
    const progressCount = progressCountByAssignment.get(assignment.id) || 0;
    const submission = submissionByAssignment.get(assignment.id);
    return {
      ...assignment,
      questionCount,
      progressCount,
      assignmentPercentage: percentage(progressCount, questionCount),
      submissionStatus: submission?.status,
      submittedAt: submission?.submitted_at ?? null,
    };
  });
  const currentAssignments = studentAssignments
    .filter((assignment) => assignment.submissionStatus !== "submitted")
    .sort((first, second) => {
      if (!first.due_at && !second.due_at) return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      if (!first.due_at) return 1;
      if (!second.due_at) return -1;
      return new Date(first.due_at).getTime() - new Date(second.due_at).getTime();
    });
  const pastAssignments = studentAssignments
    .filter((assignment) => assignment.submissionStatus === "submitted")
    .sort((first, second) => new Date(second.submittedAt || 0).getTime() - new Date(first.submittedAt || 0).getTime());
  const assignmentLoadError = membershipError || assignmentResult.error || questionRows.error || progressRows.error || submissionRows.error;

  return <>
    <section className={`dashboard-hero student-dashboard-hero student-assignments-hero ${isIgcse ? "student-dashboard-hero-igcse" : ""}`}>
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row"><Link className="dashboard-back-link" href={learningHome}>← Learning home</Link><AccountMenu signOutHref={signOutHref} /></div>
        <div className="dashboard-hero-copy"><span className="dashboard-role-label">Assignments</span><h1>Your assignments</h1><p>Continue current work or return to anything you have already submitted.</p></div>
      </Container>
    </section>
    <section className={`student-dashboard student-home-v2 student-assignment-directory section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
      <Container className="stack-2xl">
        {assignmentLoadError ? <p className="form-message form-error">Your assignments could not be refreshed just now. Please reload the page.</p> : null}
        <section className="student-assignment-directory-section stack-lg">
          <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Current work</p><h2>{currentAssignments.length ? "To do" : "You're up to date"}</h2></div><p className="muted">Open an assignment to continue from your saved work.</p></div>
          <div className="student-assignment-list">
            {currentAssignments.map((assignment, index) => <Link className={`student-assignment-card ${index === 0 ? "is-urgent" : ""}`} href={`/assignments/${assignment.id}`} key={assignment.id}><span className="student-assignment-status"><i style={{ width: `${assignment.assignmentPercentage}%` }} /></span><div><small>{classNames.get(assignment.class_id)}</small><strong>{assignment.title}</strong><span>{dueDateLabel(assignment.due_at)}</span></div><div className="student-assignment-progress"><strong>{assignment.progressCount}/{assignment.questionCount}</strong><span>questions</span></div><span className="status-pill">{assignment.progressCount ? "Continue" : "Start"}</span><span aria-hidden="true">→</span></Link>)}
            {!currentAssignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><DashboardIcon name="check" /><div><strong>No assignments waiting</strong><p>Your next assignment will appear here when your teacher sets it.</p></div></div> : null}
          </div>
        </section>

        <section className="student-assignment-directory-section student-past-assignment-directory stack-lg" id="past-assignments">
          <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Assignment history</p><h2>Past assignments</h2></div><p className="muted">Open submitted work to review your saved answers, working and any feedback your teacher has made available.</p></div>
          <div className="student-assignment-list">
            {pastAssignments.map((assignment) => <Link className="student-assignment-card is-complete" href={`/assignments/${assignment.id}`} key={assignment.id}><span className="student-assignment-status"><i style={{ width: "100%" }} /></span><div><small>{classNames.get(assignment.class_id)}</small><strong>{assignment.title}</strong><span>{assignment.submittedAt ? `Submitted ${new Date(assignment.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Submitted"}</span></div><div className="student-assignment-progress"><strong>{assignment.progressCount}/{assignment.questionCount}</strong><span>questions</span></div><span className="status-pill is-submitted">Review</span><span aria-hidden="true">→</span></Link>)}
            {!pastAssignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><DashboardIcon name="assignment" /><div><strong>No past assignments yet</strong><p>Assignments will move here after you submit them.</p></div></div> : null}
          </div>
        </section>
      </Container>
    </section>
  </>;
}
