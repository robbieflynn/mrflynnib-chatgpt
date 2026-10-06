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
  const [{ data: profile }, { data: questions }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", studentId).maybeSingle(),
    supabase.from("assignment_questions").select("question_id,position").eq("assignment_id", id).order("position"),
  ]);
  const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const questionIds = (questions ?? []).map((question) => question.question_id);
  const course = getQuestionBankCourseByCode(classRecord?.course || "");
  const studentName = profile?.display_name || "Student";
  return <>
    <section className="page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: assignment.title, href: `/teacher/assignments/${id}` }, { label: studentName }]} /><div className="stack"><p className="eyebrow">Read-only student work</p><h1>{studentName}</h1><p className="lede">Open each whiteboard to review the working saved for {assignment.title}. This view cannot change the student&apos;s work.</p></div></Container></section>
    <section className="question-bank-embed-section"><Container>{classRecord?.bank === "igcse" ? <IgcseQuestionBankEmbed assignmentId={id} questionIds={questionIds} viewedStudentId={studentId} /> : course ? <QuestionBankEmbed assignmentId={id} course={course.code} questionIds={questionIds} viewedStudentId={studentId} /> : <p>These questions are not available.</p>}</Container></section>
  </>;
}
