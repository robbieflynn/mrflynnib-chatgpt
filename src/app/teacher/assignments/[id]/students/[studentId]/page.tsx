import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { requireTeacher } from "@/lib/account-access";
import { getQuestionBankCourseByCode } from "@/lib/question-bank-courses";

export default async function StudentWorkingPage({ params, searchParams }: { params: Promise<{ id: string; studentId: string }>; searchParams: Promise<{ question?: string }> }) {
  const { id, studentId } = await params;
  const { question: requestedQuestion } = await searchParams;
  const { supabase, user } = await requireTeacher();
  const { data: assignment } = await supabase.from("assignments").select("id,title,class_id,classes(name,bank,course)").eq("id", id).eq("teacher_id", user.id).maybeSingle();
  if (!assignment) notFound();
  const { data: membership } = await supabase.from("class_memberships").select("student_id").eq("class_id", assignment.class_id).eq("student_id", studentId).maybeSingle();
  if (!membership) notFound();
  const [{ data: profile }, { data: questions }, { data: responses }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", studentId).maybeSingle(),
    supabase.from("assignment_questions").select("question_id,position,response_type,response_options").eq("assignment_id", id).order("position"),
    supabase.from("assignment_responses").select("question_id,is_correct").eq("assignment_id", id).eq("student_id", studentId),
    supabase.from("assignment_question_progress").select("question_id").eq("assignment_id", id).eq("student_id", studentId).eq("completed", true),
  ]);
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const dashboardHref = classRecord?.bank === "igcse" ? "/igcse/teacher" : "/teacher";
  const questionIds = (questions ?? []).map((question) => question.question_id);
  const focusedQuestion = requestedQuestion && (questions ?? []).find((question) => question.question_id === requestedQuestion);
  const displayedQuestionIds = focusedQuestion ? [focusedQuestion.question_id] : questionIds;
  const attemptedQuestionIds = new Set([...(progress ?? []).map((row) => row.question_id), ...(responses ?? []).map((row) => row.question_id)]);
  const course = getQuestionBankCourseByCode(classRecord?.course || "");
  const studentName = profile?.display_name || "Student";
  const workspaceClass = classRecord?.bank === "igcse" ? "teacher-workspace teacher-workspace-igcse" : "teacher-workspace";
  return <>
    <main className={workspaceClass}>
    <section className="teacher-workspace-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: assignment.title, href: `/teacher/assignments/${id}` }, { label: studentName }]} /><div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">Read-only student work</p><h1>{studentName}</h1><p>Review the answers and whiteboard working saved for {assignment.title}. Nothing can be changed from this view.</p></div><div className="teacher-workspace-stats"><span><strong>{attemptedQuestionIds.size}/{questions?.length ?? 0}</strong> attempted</span><span><strong>{responses?.filter((response) => response.is_correct === true).length ?? 0}</strong> correct</span></div></div></Container></section>
    <section className="section-tight"><Container><div className="assignment-summary-grid assignment-summary-grid-four"><div><span>Questions attempted</span><strong>{attemptedQuestionIds.size}/{questions?.length ?? 0}</strong><small>questions</small></div><div><span>Answers saved</span><strong>{responses?.length ?? 0}/{questions?.length ?? 0}</strong><small>answers</small></div><div><span>Automatically correct</span><strong>{responses?.filter((response) => response.is_correct === true).length ?? 0}</strong><small>answers</small></div><div><span>Review mode</span><strong>Read only</strong><small>student work is protected</small></div></div></Container></section>
    <section className="question-bank-embed-section"><Container className="stack">{focusedQuestion ? <div className="student-work-detail-bar"><div><span>Question {Number(focusedQuestion.position) + 1}</span><strong>Detailed answer and whiteboard</strong></div><Link className="button button-secondary button-small" href={`/teacher/assignments/${id}/students/${studentId}`}>Back to all questions</Link></div> : <div className="student-work-overview-note"><strong>All questions at a glance</strong><span>Whiteboards are shown as read-only previews. Open any card for the full question, answer and working.</span></div>}{classRecord?.bank === "igcse" ? <IgcseQuestionBankEmbed assignmentId={id} questionIds={displayedQuestionIds} viewedStudentId={studentId} assignmentView={focusedQuestion ? "detail" : "overview"} /> : course ? <QuestionBankEmbed assignmentId={id} course={course.code} questionIds={displayedQuestionIds} viewedStudentId={studentId} assignmentView={focusedQuestion ? "detail" : "overview"} /> : <p>These questions are not available.</p>}</Container></section>
    </main>
  </>;
}
