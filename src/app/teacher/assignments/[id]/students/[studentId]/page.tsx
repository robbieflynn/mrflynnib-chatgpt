import { notFound } from "next/navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { requireTeacher } from "@/lib/account-access";
import { getQuestionBankCourseByCode } from "@/lib/question-bank-courses";

export default async function StudentWorkingPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
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
  const course = getQuestionBankCourseByCode(classRecord?.course || "");
  const studentName = profile?.display_name || "Student";
  return <>
    <section className="page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: dashboardHref }, { label: assignment.title, href: `/teacher/assignments/${id}` }, { label: studentName }]} /><div className="stack"><p className="eyebrow">Read-only student work</p><h1>{studentName}</h1><p className="lede">Open each whiteboard to review the working saved for {assignment.title}. This view cannot change the student&apos;s work.</p></div></Container></section>
    <section className="section-tight teacher-dashboard"><Container><div className="assignment-status-bar"><div><span>Questions completed</span><strong>{progress?.length ?? 0} of {questions?.length ?? 0}</strong></div><div><span>Answers saved</span><strong>{responses?.length ?? 0} of {questions?.length ?? 0}</strong></div><div><span>Automatically correct</span><strong>{responses?.filter((response) => response.is_correct === true).length ?? 0}</strong></div><div><span>Review mode</span><strong>Read only</strong></div></div></Container></section>
    <section className="question-bank-embed-section"><Container>{classRecord?.bank === "igcse" ? <IgcseQuestionBankEmbed assignmentId={id} questionIds={questionIds} viewedStudentId={studentId} /> : course ? <QuestionBankEmbed assignmentId={id} course={course.code} questionIds={questionIds} viewedStudentId={studentId} /> : <p>These questions are not available.</p>}</Container></section>
  </>;
}
