import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { requireSignedIn } from "@/lib/account-access";
import { getQuestionBankCourseByCode } from "@/lib/question-bank-courses";
import { assignmentFeedbackLabel, assignmentFeedbackModeFromRecord } from "@/lib/assignment-feedback";
import { AssignmentConnectionStatus } from "@/components/assignment-connection-status";
import { AssignmentHeroProgress, AssignmentStatusBar } from "@/components/assignment-live-progress";
import type { AssignmentQuestionState } from "@/lib/use-question-bank-account";
import { getFixedAssignmentConfig, responseOptionsForFixedConfig } from "@/lib/assignment-answer-config";

export default async function StudentAssignmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const message = await searchParams;
  const { supabase, user } = await requireSignedIn();
  const { data: assignment } = await supabase.from("assignments").select("id,title,instructions,due_at,status,show_mark_scheme,feedback_mode,class_id,classes(name,bank,course)").eq("id", id).maybeSingle();
  if (!assignment) notFound();
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const [{ data: questions }, { data: progress }, { data: submission }, { data: responses }] = await Promise.all([
    supabase.from("assignment_questions").select("question_id,title_snapshot,topic_snapshot,position,response_type,response_options").eq("assignment_id", id).order("position"),
    supabase.from("assignment_question_progress").select("question_id,completed").eq("assignment_id", id).eq("student_id", user.id).eq("completed", true),
    supabase.from("assignment_submissions").select("status,submitted_at").eq("assignment_id", id).eq("student_id", user.id).maybeSingle(),
    supabase.from("assignment_responses").select("question_id,response,is_correct,attempt_count,updated_at").eq("assignment_id", id).eq("student_id", user.id),
  ]);
  const effectiveQuestions = (questions ?? []).map((question) => {
    const fixed = getFixedAssignmentConfig(classRecord?.bank, question.question_id);
    return fixed ? {
      ...question,
      response_type: fixed.type,
      response_options: responseOptionsForFixedConfig(fixed),
    } : question;
  });
  const progressIds = new Set((progress ?? []).map((item) => item.question_id));
  const responseByQuestion = new Map((responses ?? []).map((response) => [response.question_id, response]));
  const completed = effectiveQuestions.filter((question) => {
    const response = responseByQuestion.get(question.question_id);
    if (!response) return progressIds.has(question.question_id);
    if (question.response_type === "multipart") return progressIds.has(question.question_id);
    return question.response_type === "teacher_review" || response.is_correct === true || Number(response.attempt_count || 0) >= 2;
  }).length;
  const total = effectiveQuestions.length;
  const course = getQuestionBankCourseByCode(classRecord?.course || "");
  const questionIds = effectiveQuestions.map((question) => question.question_id);
  const answered = responses?.length ?? 0;
  const correct = responses?.filter((response) => response.is_correct === true).length ?? 0;
  const workspaceClass = classRecord?.bank === "igcse" ? "student-assignment-workspace student-assignment-workspace-igcse" : "student-assignment-workspace";
  const feedbackMode = assignmentFeedbackModeFromRecord(assignment);
  const isSubmitted = submission?.status === "submitted";
  const initialQuestions: AssignmentQuestionState[] = effectiveQuestions.map((question) => {
    const saved = responseByQuestion.get(question.question_id);
    return {
      questionId: question.question_id,
      responseType: String(question.response_type || "teacher_review"),
      responseOptions: Array.isArray(question.response_options) ? question.response_options : [],
      response: saved?.response ?? null,
      isCorrect: saved?.is_correct ?? null,
      attemptCount: Number(saved?.attempt_count || 0),
      updatedAt: saved?.updated_at ?? null,
      readOnly: isSubmitted,
      submitted: isSubmitted,
      position: Number(question.position || 0),
      optionSeed: user.id,
    };
  });
  const dueLabel = assignment.due_at ? new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No due date";
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Student dashboard", href: "/account" }, { label: assignment.title }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">{classRecord?.name || "Assignment"}</p><h1>{assignment.title}</h1>{assignment.instructions ? <p>{assignment.instructions}</p> : <p>Complete the questions below and show your working on the whiteboard or paper.</p>}</div><AssignmentHeroProgress assignmentId={id} initialAnswered={answered} initialCompleted={completed} total={total} /></div></Container></section>
    <section className="section-tight student-dashboard"><Container className="stack-xl">
      <AssignmentConnectionStatus />
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}{message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <AssignmentStatusBar assignmentId={id} dueLabel={dueLabel} initialAnswered={answered} initialCompleted={completed} initialCorrect={correct} isSubmitted={isSubmitted} total={total} />
      <div className="assignment-note"><strong>Your work saves automatically.</strong><span>Work through one question at a time. Multiple-choice answers allow a second chance. Complete written working on the whiteboard or paper.</span></div>
      <div className="assignment-feedback-notice"><span>Mark schemes &amp; solutions</span><strong>{assignmentFeedbackLabel(feedbackMode)}</strong></div>
    </Container></section>
    <section className="question-bank-embed-section"><Container>
      {classRecord?.bank === "igcse" ? <IgcseQuestionBankEmbed assignmentId={id} questionIds={questionIds} feedbackMode={feedbackMode} assignmentSubmitted={isSubmitted} assignmentView="step" initialQuestions={initialQuestions} /> : course ? <QuestionBankEmbed assignmentId={id} course={course.code} questionIds={questionIds} feedbackMode={feedbackMode} assignmentSubmitted={isSubmitted} assignmentView="step" initialQuestions={initialQuestions} /> : <p>These questions are not available.</p>}
    </Container></section>
    <section className="section-tight"><Container><Link className="text-link" href="/account">Back to student dashboard</Link></Container></section>
    </main>
  </>;
}
