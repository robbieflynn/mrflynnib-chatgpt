import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher();
  const { data: classRecord } = await supabase.from("classes").select("id,name,course,join_code").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) notFound();
  const [{ data: memberships }, { data: assignments }] = await Promise.all([
    supabase.from("class_memberships").select("student_id,joined_at").eq("class_id", id).order("joined_at"),
    supabase.from("assignments").select("id,title,due_at,status,created_at,assignment_questions(count),assignment_submissions(count)").eq("class_id", id).order("created_at", { ascending: false }),
  ]);
  const studentIds = (memberships ?? []).map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const studentNames = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  return <>
    <section className="page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: classRecord.name }]} /><div className="stack"><p className="eyebrow">{classRecord.course}</p><h1>{classRecord.name}</h1></div></Container></section>
    <section className="section-tight teacher-dashboard"><Container className="stack-xl">
      <div className="class-code-card"><div><span>Student joining code</span><strong>{classRecord.join_code}</strong><small>Students enter this code on their dashboard.</small></div><Link className="button" href={`/teacher/classes/${id}/assignments/new`}>Set an assignment</Link></div>
      <div className="teacher-two-column">
        <div className="stack"><div className="dashboard-section-heading"><div><p className="eyebrow">Assignments</p><h2>Set work</h2></div></div>
          <div className="teacher-list">
            {(assignments ?? []).map((assignment) => <Link className="teacher-list-row" href={`/teacher/assignments/${assignment.id}`} key={assignment.id}><span><strong>{assignment.title}</strong><small>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No due date"}</small></span><span>{Array.isArray(assignment.assignment_questions) ? assignment.assignment_questions[0]?.count ?? 0 : 0} questions</span><span aria-hidden="true">→</span></Link>)}
            {!assignments?.length ? <div className="account-card"><p className="muted">No assignments yet.</p></div> : null}
          </div>
        </div>
        <aside className="stack"><div><p className="eyebrow">Students</p><h2>{memberships?.length ?? 0} joined</h2></div><div className="teacher-list">
          {(memberships ?? []).map((membership) => <div className="teacher-list-row" key={membership.student_id}><span><strong>{studentNames.get(membership.student_id) || "Student"}</strong><small>Joined {new Date(membership.joined_at).toLocaleDateString("en-GB")}</small></span></div>)}
          {!memberships?.length ? <div className="account-card"><p className="muted">Share the joining code with your students.</p></div> : null}
        </div></aside>
      </div>
    </Container></section>
  </>;
}
