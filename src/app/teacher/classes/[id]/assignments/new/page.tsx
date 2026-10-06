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
  return <>
    <section className="page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord.name, href: `/teacher/classes/${id}` }, { label: "New assignment" }]} /><div className="stack"><p className="eyebrow">{classRecord.course}</p><h1>Set an assignment</h1><p className="lede">Choose real questions from the bank, then publish them directly to this class.</p></div></Container></section>
    <section className="section-tight teacher-dashboard"><Container>
      <form action={createAssignment} className="assignment-builder stack-xl"><input name="classId" type="hidden" value={id} />
        {message.error ? <p className="form-message form-error">{message.error}</p> : null}
        <div className="account-card form-grid">
          <label className="field"><span>Assignment title</span><input name="title" placeholder="Functions practice" maxLength={120} required /></label>
          <label className="field"><span>Due date <small className="muted">(optional)</small></span><input name="dueDate" type="date" /></label>
          <label className="field field-full"><span>Instructions <small className="muted">(optional)</small></span><textarea name="instructions" maxLength={1500} placeholder="Complete the questions and show your working on the whiteboards." /></label>
        </div>
        <div className="stack"><div><p className="eyebrow">Question bank</p><h2>Choose questions</h2></div><AssignmentQuestionPicker bank={classRecord.bank} course={course} /></div>
        <div className="assignment-builder-actions"><p className="muted small">Publishing makes the assignment visible to every student currently in the class and anyone who joins later.</p><button className="button" type="submit">Publish assignment</button></div>
      </form>
    </Container></section>
  </>;
}
