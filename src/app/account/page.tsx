import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container, PageHero } from "@/components/ui";
import { StudentAccountForm } from "@/components/student-account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { getQuestionBankCourse, questionBankCourses } from "@/lib/question-bank-courses";
import progressManifest from "@/data/question-bank-progress.json";
import { joinClass } from "./actions";

export const metadata: Metadata = {
  title: "Mr Flynn IB account",
  description: "Sign in to your student or teacher account.",
  robots: { index: false, follow: false },
};

function percentage(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

type AccountSearchParams = {
  course?: string | string[];
  qualification?: string | string[];
  next?: string | string[];
  error?: string | string[];
  success?: string | string[];
  teacher?: string | string[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const pageSearchParams = await searchParams;
  const requestedNext = typeof pageSearchParams.next === "string" ? pageSearchParams.next : "";
  const isTeacherJourney = requestedNext === "/teacher" || requestedNext === "/igcse/teacher";
  if (!hasSupabaseBrowserConfig()) {
    return (
      <>
        <PageHero eyebrow={isTeacherJourney ? "Teacher account" : "Student account"} title="Accounts are being prepared" intro="The account service still needs its secure connection before you can sign in." />
        <section className="section-tight"><Container className="narrow"><div className="account-card"><p>No student information is being collected yet.</p></div></Container></section>
      </>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <PageHero
          eyebrow={isTeacherJourney ? "Teacher account" : "Student account"}
          title={isTeacherJourney ? "Teacher sign in" : "Save your question-bank progress"}
          intro={isTeacherJourney ? "Sign in to manage classes and assignments, or create a teacher account to request approval." : "Sign in to tick off completed questions and continue your whiteboard working on another device."}
        />
        <section className="section-tight"><Container className="account-layout"><Suspense fallback={<div className="account-card">Loading account…</div>}><StudentAccountForm /></Suspense>{isTeacherJourney ? <aside className="account-benefits stack"><h2>For teachers</h2><ul><li>Create classes and share joining codes.</li><li>Choose questions and set assignments.</li></ul></aside> : <aside className="account-benefits stack"><h2>Save your progress</h2><ul><li>Tick off questions as you complete them.</li><li>Return to editable whiteboard working later.</li></ul></aside>}</Container></section>
      </>
    );
  }

  if (isTeacherJourney) redirect(requestedNext);

  const requestedCourse = pageSearchParams.course;
  const requestedQualification = typeof pageSearchParams.qualification === "string" ? pageSearchParams.qualification : "";
  const isIgcse = requestedQualification === "igcse" || requestedNext.startsWith("/igcse/");
  const { data: profile } = await supabase.from("profiles").select("role,teacher_status").eq("user_id", user.id).maybeSingle();
  if (profile?.role === "teacher" || profile?.role === "admin") redirect(isIgcse ? "/igcse/teacher" : "/teacher");
  const selectedCourse = getQuestionBankCourse(typeof requestedCourse === "string" ? requestedCourse : "") ?? questionBankCourses[0];
  const courseProgress = isIgcse ? progressManifest.igcse : progressManifest.courses[selectedCourse.code];
  const bank = isIgcse ? "igcse" : "ib";
  const questionBankHref = isIgcse ? "/igcse/question-bank" : `/question-bank/${selectedCourse.slug}`;
  const progressLabel = isIgcse ? "IGCSE" : selectedCourse.code;
  const completedQuestionIds = new Set<string>();
  let pageStart = 0;

  while (true) {
    const { data, error } = await supabase
      .from("question_progress")
      .select("question_id")
      .eq("bank", bank)
      .eq("completed", true)
      .range(pageStart, pageStart + 999);
    if (error || !data) break;
    data.forEach((row) => completedQuestionIds.add(row.question_id));
    if (data.length < 1000) break;
    pageStart += 1000;
  }

  const { count: whiteboardCount } = await supabase
    .from("whiteboard_documents")
    .select("question_id", { count: "exact", head: true })
    .eq("bank", bank);
  const courseCompleted = courseProgress.questionIds.filter((id) => completedQuestionIds.has(id)).length;
  const coursePercentage = percentage(courseCompleted, courseProgress.questionIds.length);
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
  const { data: memberships } = await supabase.from("class_memberships").select("class_id,classes(id,name,course)").eq("student_id", user.id);
  const classIds = (memberships ?? []).map((membership) => membership.class_id);
  const { data: assignments } = classIds.length
    ? await supabase.from("assignments").select("id,title,due_at,class_id,assignment_questions(count),assignment_question_progress(count),assignment_submissions(status)").in("class_id", classIds).eq("status", "published").order("created_at", { ascending: false })
    : { data: [] };
  const classNames = new Map((memberships ?? []).map((membership) => {
    const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
    return [membership.class_id, classRecord?.name || "Class"];
  }));
  const accountError = typeof pageSearchParams.error === "string" ? pageSearchParams.error : "";
  const accountSuccess = typeof pageSearchParams.success === "string" ? pageSearchParams.success : "";
  const teacherApprovalRequired = pageSearchParams.teacher === "approval-required";
  const teacherRequested = pageSearchParams.teacher === "requested";

  return (
    <>
      <PageHero eyebrow="Student dashboard" title={displayName ? `Welcome back, ${displayName}` : "Your question-bank progress"} />
      <section className={`student-dashboard section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
        <Container className="stack-xl">
          {accountError ? <p className="form-message form-error">{accountError}</p> : null}
          {accountSuccess ? <p className="form-message form-success">{accountSuccess}</p> : null}
          {teacherRequested ? <p className="form-message form-success">Your teacher account request has been sent for approval. You can use the student question bank while you wait.</p> : null}
          {teacherApprovalRequired ? <p className="form-message form-error">{profile?.teacher_status === "pending" ? "Your teacher account is waiting for approval." : "Teacher access must be approved before this account can create classes and assignments."}</p> : null}
          {profile?.teacher_status === "pending" && !teacherRequested ? <p className="teacher-pending-note"><strong>Teacher approval pending</strong><span>You will be able to create classes and assignments once your request is approved.</span></p> : null}
          {profile?.role === "teacher" || profile?.role === "admin" ? <div className="teacher-access-card"><div><span>{profile.role === "admin" ? "Teacher administrator" : "Teacher account"}</span><strong>Manage classes and assignments</strong></div><Link className="button button-small" href={isIgcse ? "/igcse/teacher" : "/teacher"}>Open teacher dashboard</Link></div> : (
            <div className="student-classes-panel">
              <div className="student-assignments stack">
                <div><p className="eyebrow">Assignments</p><h2>Your classwork</h2></div>
                <div className="teacher-list">
                  {(assignments ?? []).map((assignment) => {
                    const questionCount = Array.isArray(assignment.assignment_questions) ? assignment.assignment_questions[0]?.count ?? 0 : 0;
                    const progressCount = Array.isArray(assignment.assignment_question_progress) ? assignment.assignment_question_progress[0]?.count ?? 0 : 0;
                    const submission = Array.isArray(assignment.assignment_submissions) ? assignment.assignment_submissions[0] : null;
                    return <Link className="teacher-list-row" href={`/assignments/${assignment.id}`} key={assignment.id}><span><strong>{assignment.title}</strong><small>{classNames.get(assignment.class_id)} · {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No due date"}</small></span><span>{progressCount} of {questionCount}</span><span className={`status-pill ${submission?.status === "submitted" ? "is-submitted" : ""}`}>{submission?.status === "submitted" ? "Submitted" : progressCount ? "In progress" : "Start"}</span></Link>;
                  })}
                  {!assignments?.length ? <div className="account-card"><p className="muted">No assignments have been set for you yet.</p></div> : null}
                </div>
              </div>
              <form action={joinClass} className="account-card stack"><div><p className="eyebrow">Join a class</p><h3>Enter your teacher&apos;s code</h3></div><label className="field"><span>Class code</span><input name="code" placeholder="ABC1234" maxLength={10} required /></label><button className="button button-small" type="submit">Join class</button></form>
            </div>
          )}
          {isIgcse ? (
            <div className="dashboard-course-bar dashboard-course-bar-single">
              <div><span>Your question bank</span><strong>Edexcel IGCSE Mathematics</strong></div>
            </div>
          ) : (
            <div className="dashboard-course-bar">
              <div>
                <span>Your course</span>
                <strong>{selectedCourse.pathway} {selectedCourse.level}</strong>
              </div>
              <nav aria-label="Choose your course">
                {questionBankCourses.map((course) => (
                  <Link aria-current={course.slug === selectedCourse.slug ? "page" : undefined} href={`/account?course=${course.slug}`} key={course.slug}>{course.code}</Link>
                ))}
              </nav>
            </div>
          )}

          <div className="dashboard-overview">
            <div className="dashboard-overview-title">
              <span>{progressLabel} progress</span>
              <strong>{courseCompleted.toLocaleString("en-GB")} of {courseProgress.questionIds.length.toLocaleString("en-GB")} questions completed</strong>
            </div>
            <div className="dashboard-progress" aria-label={`${coursePercentage}% complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={coursePercentage} role="progressbar">
              <span style={{ width: `${coursePercentage}%` }} />
            </div>
            <div className="dashboard-overview-meta"><strong>{coursePercentage}%</strong><span>{whiteboardCount ?? 0} saved whiteboards</span></div>
            <Link className="button button-small" href={questionBankHref}>Continue in question bank</Link>
          </div>

          <div className="dashboard-topics stack-lg">
            <div className="dashboard-section-heading">
              <p className="eyebrow">Topics and subtopics</p>
              <p className="muted">Open a topic to view every subtopic. Select a subtopic to go straight to those questions.</p>
            </div>
            <div className="dashboard-topic-list">
              {courseProgress.topics.map((topic, topicIndex) => {
                const topicCompleted = topic.questionIds.filter((id) => completedQuestionIds.has(id)).length;
                const topicPercentage = percentage(topicCompleted, topic.questionIds.length);
                return (
                  <details className="dashboard-topic" key={topic.name} open={topicIndex === 0}>
                    <summary>
                      <span className="dashboard-topic-number">{topicIndex + 1}</span>
                      <span className="dashboard-topic-title"><strong>{topic.name}</strong><small>{topicCompleted} of {topic.questionIds.length} completed</small></span>
                      <span className="dashboard-topic-meter" aria-hidden="true"><i style={{ width: `${topicPercentage}%` }} /></span>
                      <strong className="dashboard-topic-percent">{topicPercentage}%</strong>
                      <span className="dashboard-topic-toggle" aria-hidden="true" />
                    </summary>
                    <div className="dashboard-subtopics">
                      {topic.subtopics.map((subtopic) => {
                        const subtopicCompleted = subtopic.questionIds.filter((id) => completedQuestionIds.has(id)).length;
                        const subtopicPercentage = percentage(subtopicCompleted, subtopic.questionIds.length);
                        const href = isIgcse
                          ? `/igcse/question-bank?topic=${encodeURIComponent(topic.name)}&subtopic=${encodeURIComponent(subtopic.name)}`
                          : `/question-bank/${selectedCourse.slug}?topic=${encodeURIComponent(topic.name)}&subtopic=${encodeURIComponent(subtopic.name)}`;
                        return (
                          <Link className="dashboard-subtopic" href={href} key={subtopic.name}>
                            <span><strong>{subtopic.name}</strong><small>{subtopicCompleted} of {subtopic.questionIds.length} completed</small></span>
                            <span className="dashboard-subtopic-meter" aria-hidden="true"><i style={{ width: `${subtopicPercentage}%` }} /></span>
                            <strong>{subtopicPercentage}%</strong>
                            <span aria-hidden="true">→</span>
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          <div className="dashboard-footer-row"><p className="small muted">Signed in as {user.email}</p><SignOutButton /></div>
        </Container>
      </section>
    </>
  );
}
