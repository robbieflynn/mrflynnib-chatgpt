import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const [questionRows, submissionRows] = assignmentIds.length
    ? await Promise.all([
      supabase.from("assignment_questions").select("assignment_id").in("assignment_id", assignmentIds),
      supabase.from("assignment_submissions").select("assignment_id,status").in("assignment_id", assignmentIds),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
    ];
  const questionCountByAssignment = new Map<string, number>();
  (questionRows.data ?? []).forEach((row) => questionCountByAssignment.set(row.assignment_id, (questionCountByAssignment.get(row.assignment_id) || 0) + 1));
  const submittedCountByAssignment = new Map<string, number>();
  (submissionRows.data ?? []).forEach((row) => {
    if (row.status === "submitted") submittedCountByAssignment.set(row.assignment_id, (submittedCountByAssignment.get(row.assignment_id) || 0) + 1);
  });
  const assignmentLoadError = assignmentResult.error || questionRows.error || submissionRows.error;
  const studentIds = (memberships ?? []).map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const studentNames = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  const isIgcse = classRecord.course === "IGCSE Higher";
  const workspaceClass = isIgcse ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord.name }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord.course}</p><h1>{classRecord.name}</h1><p>Set work, monitor progress and review every student&apos;s answers and working.</p></div><div className="teacher-workspace-stats" aria-label="Class summary"><span><strong>{memberships.length}</strong> students</span><span><strong>{assignments.length}</strong> assignments</span></div></div></Container></section>
    <section className="section-tight"><Container className="stack-xl">
      <div className="class-toolbar"><div className="class-code"><span>Student joining code</span><strong>{classRecord.join_code}</strong><small>Students enter this code on their dashboard.</small></div><Link className="button" href={`/teacher/classes/${id}/assignments/new`}>Set an assignment</Link></div>
      <div className="teacher-two-column">
        <div className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Classwork</p><h2>Assignments</h2></div><p>Open an assignment to see progress by student and by question.</p></div>
          {assignmentLoadError ? <p className="form-message form-error">The assignments could not be refreshed just now. Please reload the page.</p> : null}
          <div className="teacher-list">
            {assignments.map((assignment) => <Link className="teacher-list-row teacher-assignment-row" href={`/teacher/assignments/${assignment.id}`} key={assignment.id}><span><strong>{assignment.title}</strong><small>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No due date"}</small></span><span className="teacher-list-meta"><strong>{questionCountByAssignment.get(assignment.id) || 0}</strong> questions</span><span className="teacher-list-meta"><strong>{submittedCountByAssignment.get(assignment.id) || 0}/{memberships.length}</strong> submitted</span><span className="teacher-row-arrow" aria-hidden="true">→</span></Link>)}
            {!assignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><span aria-hidden="true">＋</span><div><strong>No assignments yet</strong><p>Set the first piece of work for this class.</p></div></div> : null}
          </div>
        </div>
        <aside className="teacher-students-panel stack"><div className="teacher-section-heading teacher-roster-heading"><div><p className="eyebrow">Students</p><h2>Student roster</h2></div><span className="teacher-panel-count">{memberships.length} joined</span></div><div className="teacher-list">
          {(memberships ?? []).map((membership) => <div className="teacher-list-row teacher-student-row" key={membership.student_id}><span className="student-avatar" aria-hidden="true">{(studentNames.get(membership.student_id) || "S").slice(0, 1).toUpperCase()}</span><span><strong>{studentNames.get(membership.student_id) || "Student"}</strong><small>Joined {new Date(membership.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></span></div>)}
          {!memberships?.length ? <div className="dashboard-empty-state compact"><span aria-hidden="true">#</span><div><strong>No students yet</strong><p>Share the joining code above.</p></div></div> : null}
        </div></aside>
      </div>
    </Container></section></main>
  </>;
}
