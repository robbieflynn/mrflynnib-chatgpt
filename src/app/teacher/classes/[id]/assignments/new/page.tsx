import { notFound } from "next/navigation";
import { AssignmentQuestionPicker } from "@/components/assignment-question-picker";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { createAssignment } from "@/app/teacher/actions";
import { assignmentFeedbackModeFromRecord, assignmentFeedbackOptions } from "@/lib/assignment-feedback";
import { PendingSubmitButton } from "@/components/pending-submit-button";

export default async function NewAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; shadowOf?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: classRecord } = await supabase.from("classes").select("id,name,bank,course").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) notFound();
  const dashboardHref = classRecord.bank === "igcse" ? "/igcse/teacher" : "/teacher";
  const course = classRecord.course as "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";
  const workspaceClass = classRecord.bank === "igcse" ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  let shadowSourceIds: string[] = [];
  let sourceTitle = "";
  let sourceInstructions = "";
  let sourceFeedbackMode = "after_question";
  if (message.shadowOf) {
    const { data: sourceAssignment } = await supabase
      .from("assignments")
      .select("id,title,instructions,feedback_mode,show_mark_scheme,class_id")
      .eq("id", message.shadowOf)
      .eq("class_id", id)
      .eq("teacher_id", user.id)
      .maybeSingle();
    if (sourceAssignment) {
      const { data: sourceQuestions } = await supabase
        .from("assignment_questions")
        .select("question_id,position")
        .eq("assignment_id", sourceAssignment.id)
        .order("position");
      shadowSourceIds = (sourceQuestions ?? []).map((question) => String(question.question_id));
      sourceTitle = `${sourceAssignment.title} · Shadow task`;
      sourceInstructions = sourceAssignment.instructions || "";
      sourceFeedbackMode = assignmentFeedbackModeFromRecord(sourceAssignment);
    }
  }
  const creatingShadow = shadowSourceIds.length > 0;
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: classRecord.name, href: `/teacher/classes/${id}` }, { label: creatingShadow ? "Shadow task" : "New assignment" }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord.course}</p><h1>{creatingShadow ? "Create a shadow task" : "Set an assignment"}</h1><p>{creatingShadow ? "Each source question is replaced with a different question matched by paper, section, difficulty and subtopic. Review the choices before publishing." : `Choose questions and publish the work to ${classRecord.name}. Answer checking is set automatically.`}</p></div><span className="teacher-workspace-icon" aria-hidden="true">＋</span></div></Container></section>
    <section className="section-tight"><Container>
      <form action={createAssignment} className="assignment-builder stack-xl"><input name="classId" type="hidden" value={id} />
        {message.error ? <p className="form-message form-error">{message.error}</p> : null}
        <div className="assignment-setup-card form-grid">
          <label className="field"><span>Assignment title</span><input name="title" defaultValue={sourceTitle} placeholder="Functions practice" maxLength={120} required /></label>
          <label className="field"><span>Due date <small className="muted">(optional)</small></span><input name="dueDate" type="date" /></label>
          <label className="field field-full"><span>Instructions <small className="muted">(optional)</small></span><textarea name="instructions" defaultValue={sourceInstructions} maxLength={1500} placeholder="Complete the questions and show your working on the whiteboard or paper." /></label>
          <fieldset className="assignment-feedback-settings field-full"><legend>Mark schemes and worked solutions</legend><p>Choose when students can open the complete feedback for each question. You can change this after publishing.</p><div className="assignment-feedback-options">{assignmentFeedbackOptions.map((option) => <label className="assignment-feedback-option" key={option.value}><input name="feedbackMode" type="radio" value={option.value} defaultChecked={option.value === sourceFeedbackMode} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</div></fieldset>
        </div>
        <div className="stack"><div className="teacher-section-heading"><div><p className="eyebrow">Question bank</p><h2>{creatingShadow ? "Review matched questions" : "Choose questions"}</h2></div><p>{creatingShadow ? "The complete shadow task is prepared automatically. You can still remove or replace any question before publishing." : "Select up to 100 questions. Suitable parts become five-choice questions automatically. Proofs, diagrams and written explanations use whiteboard or paper completion."}</p></div><AssignmentQuestionPicker bank={classRecord.bank} course={course} draftId={creatingShadow ? `${id}-shadow-${message.shadowOf}` : id} shadowSourceIds={shadowSourceIds} /></div>
        <div className="assignment-builder-actions"><p className="muted small">Publishing makes the assignment visible to every student currently in the class and anyone who joins later.</p><PendingSubmitButton idleLabel="Publish assignment" pendingLabel="Publishing…" /></div>
      </form>
    </Container></section></main>
  </>;
}
