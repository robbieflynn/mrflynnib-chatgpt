import { notFound } from "next/navigation";
import { AssignmentQuestionPicker } from "@/components/assignment-question-picker";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { createAssignment } from "@/app/teacher/actions";

export default async function NewAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: classRecord } = await supabase.from("classes").select("id,name,bank,course").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) notFound();
  const dashboardHref = classRecord.bank === "igcse" ? "/igcse/teacher" : "/teacher";
  const course = classRecord.course as "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";
  const workspaceClass = classRecord.bank === "igcse" ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord.name, href: `/teacher/classes/${id}` }, { label: "New assignment" }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord.course}</p><h1>Set an assignment</h1><p>Choose questions, decide how answers are checked, and publish the work to {classRecord.name}.</p></div><span className="teacher-workspace-icon" aria-hidden="true">＋</span></div></Container></section>
    <section className="section-tight"><Container>
      <form action={createAssignment} className="assignment-builder stack-xl"><input name="classId" type="hidden" value={id} />
        {message.error ? <p className="form-message form-error">{message.error}</p> : null}
        <div className="assignment-setup-card form-grid">
          <label className="field"><span>Assignment title</span><input name="title" placeholder="Functions practice" maxLength={120} required /></label>
          <label className="field"><span>Due date <small className="muted">(optional)</small></span><input name="dueDate" type="date" /></label>
          <label className="field field-full"><span>Instructions <small className="muted">(optional)</small></span><textarea name="instructions" maxLength={1500} placeholder="Complete the questions and show your working on the whiteboards." /></label>
          <label className="assignment-setting field-full"><input name="showMarkScheme" type="checkbox" defaultChecked /><span><strong>Show mark schemes and worked solutions</strong><small>Students can open them while completing this assignment. You can change this after publishing.</small></span></label>
        </div>
        <div className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Question bank</p><h2>Choose questions</h2></div><p>Select up to 40 questions. Each one can be automatically checked or left for teacher review.</p></div><AssignmentQuestionPicker bank={classRecord.bank} course={course} /></div>
        <div className="assignment-builder-actions"><p className="muted small">Publishing makes the assignment visible to every student currently in the class and anyone who joins later.</p><button className="button" type="submit">Publish assignment</button></div>
      </form>
    </Container></section></main>
  </>;
}
