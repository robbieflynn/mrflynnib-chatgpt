import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { requireSignedIn } from "@/lib/account-access";
import { getQuestionBankCourseByCode } from "@/lib/question-bank-courses";
import { submitAssignment } from "@/app/account/actions";

export default async function StudentAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireSignedIn();
  const { data: assignment } = await supabase.from("assignments").select("id,title,instructions,due_at,status,class_id,classes(name,bank,course)").eq("id", id).maybeSingle();
  if (!assignment) notFound();
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const [{ data: questions }, { data: progress }, { data: submission }] = await Promise.all([
    supabase.from("assignment_questions").select("question_id,title_snapshot,topic_snapshot,position").eq("assignment_id", id).order("position"),
    supabase.from("assignment_question_progress").select("question_id,completed").eq("assignment_id", id).eq("student_id", user.id).eq("completed", true),
    supabase.from("assignment_submissions").select("status,submitted_at").eq("assignment_id", id).eq("student_id", user.id).maybeSingle(),
  ]);
  const completed = progress?.length ?? 0;
  const total = questions?.length ?? 0;
  const course = getQuestionBankCourseByCode(classRecord?.course || "");
  const questionIds = (questions ?? []).map((question) => question.question_id);
  return <>
    <section className="page-hero assignment-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Student dashboard", href: "/account" }, { label: assignment.title }]} /><div className="stack"><p className="eyebrow">{classRecord?.name || "Assignment"}</p><h1>{assignment.title}</h1>{assignment.instructions ? <p className="lede">{assignment.instructions}</p> : null}</div></Container></section>
    <section className="section-tight student-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}{message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="assignment-status-bar"><div><span>Your progress</span><strong>{completed} of {total} questions completed</strong></div><div className="dashboard-progress"><span style={{ width: `${total ? Math.round(completed / total * 100) : 0}%` }} /></div><div><span>Due</span><strong>{assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No due date"}</strong></div><form action={submitAssignment}><input name="assignmentId" type="hidden" value={id} /><button className="button button-small" type="submit">{submission?.status === "submitted" ? "Submit again" : "Submit assignment"}</button></form></div>
      <div className="assignment-note"><strong>Your work saves automatically.</strong><span>Tick each question as you finish it. Your teacher can see your completion and saved whiteboard working for this assignment.</span></div>
    </Container></section>
    <section className="question-bank-embed-section"><Container>
      {classRecord?.bank === "igcse" ? <IgcseQuestionBankEmbed assignmentId={id} questionIds={questionIds} /> : course ? <QuestionBankEmbed assignmentId={id} course={course.code} questionIds={questionIds} /> : <p>These questions are not available.</p>}
    </Container></section>
    <section className="section-tight"><Container><Link className="text-link" href="/account">Back to student dashboard</Link></Container></section>
  </>;
}
