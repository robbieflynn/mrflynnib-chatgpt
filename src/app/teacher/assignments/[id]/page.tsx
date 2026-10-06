import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";

export default async function TeacherAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: assignment } = await supabase.from("assignments").select("id,title,instructions,due_at,status,class_id,classes(id,name,course)").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!assignment) notFound();
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const dashboardHref = classRecord?.course === "IGCSE Higher" ? "/igcse/teacher" : "/teacher";
  const [{ data: questions }, { data: memberships }, { data: progress }, { data: submissions }] = await Promise.all([
    supabase.from("assignment_questions").select("question_id,title_snapshot,topic_snapshot,position").eq("assignment_id", id).order("position"),
    supabase.from("class_memberships").select("student_id,joined_at").eq("class_id", assignment.class_id),
    supabase.from("assignment_question_progress").select("student_id,question_id,completed").eq("assignment_id", id).eq("completed", true),
    supabase.from("assignment_submissions").select("student_id,status,submitted_at").eq("assignment_id", id),
  ]);
  const studentIds = (memberships ?? []).map((membership) => membership.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("user_id,display_name").in("user_id", studentIds) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name || "Student"]));
  const submitted = new Map((submissions ?? []).map((row) => [row.student_id, row]));
  const completedByStudent = new Map<string, number>();
  (progress ?? []).forEach((row) => completedByStudent.set(row.student_id, (completedByStudent.get(row.student_id) || 0) + 1));
  const total = questions?.length ?? 0;
  return <>
    <section className="page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord?.name || "Class", href: `/teacher/classes/${assignment.class_id}` }, { label: assignment.title }]} /><div className="stack"><p className="eyebrow">{classRecord?.course}</p><h1>{assignment.title}</h1>{assignment.instructions ? <p className="lede">{assignment.instructions}</p> : null}</div></Container></section>
    <section className="section-tight teacher-dashboard"><Container className="stack-xl">
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="assignment-status-bar"><div><span>Questions</span><strong>{total}</strong></div><div><span>Students</span><strong>{memberships?.length ?? 0}</strong></div><div><span>Submitted</span><strong>{submissions?.filter((item) => item.status === "submitted").length ?? 0}</strong></div><div><span>Due</span><strong>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No due date"}</strong></div></div>
      <div className="stack"><div><p className="eyebrow">Student progress</p><h2>Class overview</h2></div><div className="teacher-progress-table" role="table">
        <div className="teacher-progress-row teacher-progress-heading" role="row"><span>Student</span><span>Completed</span><span>Status</span></div>
        {(memberships ?? []).map((membership) => { const done = completedByStudent.get(membership.student_id) || 0; const record = submitted.get(membership.student_id); return <div className="teacher-progress-row" role="row" key={membership.student_id}><span><strong>{names.get(membership.student_id) || "Student"}</strong><Link className="text-link small" href={`/teacher/assignments/${id}/students/${membership.student_id}`}>View working</Link></span><span><strong>{done} of {total}</strong><i><b style={{ width: `${total ? Math.round(done / total * 100) : 0}%` }} /></i></span><span className={`status-pill ${record?.status === "submitted" ? "is-submitted" : ""}`}>{record?.status === "submitted" ? "Submitted" : done ? "In progress" : "Not started"}</span></div>; })}
        {!memberships?.length ? <div className="account-card"><p className="muted">No students have joined this class yet.</p></div> : null}
      </div></div>
      <div className="stack"><div><p className="eyebrow">Assigned questions</p><h2>Question list</h2></div><div className="teacher-list">{(questions ?? []).map((question, index) => <div className="teacher-list-row" key={question.question_id}><span><strong>{index + 1}. {question.title_snapshot || question.question_id}</strong><small>{question.topic_snapshot}</small></span><span>{question.question_id}</span></div>)}</div></div>
    </Container></section>
  </>;
}
