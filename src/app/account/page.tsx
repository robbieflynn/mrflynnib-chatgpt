import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container, PageHero } from "@/components/ui";
import { DashboardIcon } from "@/components/dashboard-icon";
import { AccountMenu } from "@/components/account-menu";
import { StudentAccountForm } from "@/components/student-account-form";
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
  const { data: memberships } = await supabase.from("class_memberships").select("class_id,joined_at,classes(id,name,course,bank)").eq("student_id", user.id);
  const activeMemberships = (memberships ?? []).filter((membership) => {
    const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
    return classRecord?.bank === bank;
  });
  const classIds = activeMemberships.map((membership) => membership.class_id);
  const assignmentResult = classIds.length
    ? await supabase.from("assignments").select("id,title,due_at,class_id").in("class_id", classIds).eq("status", "published").order("created_at", { ascending: false })
    : { data: [], error: null };
  const assignments = assignmentResult.data ?? [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const [questionRows, progressRows, submissionRows] = assignmentIds.length
    ? await Promise.all([
      supabase.from("assignment_questions").select("assignment_id").in("assignment_id", assignmentIds),
      supabase.from("assignment_question_progress").select("assignment_id").in("assignment_id", assignmentIds).eq("student_id", user.id).eq("completed", true),
      supabase.from("assignment_submissions").select("assignment_id,status").in("assignment_id", assignmentIds).eq("student_id", user.id),
    ])
    : [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
  const questionCountByAssignment = new Map<string, number>();
  (questionRows.data ?? []).forEach((row) => questionCountByAssignment.set(row.assignment_id, (questionCountByAssignment.get(row.assignment_id) || 0) + 1));
  const progressCountByAssignment = new Map<string, number>();
  (progressRows.data ?? []).forEach((row) => progressCountByAssignment.set(row.assignment_id, (progressCountByAssignment.get(row.assignment_id) || 0) + 1));
  const submissionByAssignment = new Map((submissionRows.data ?? []).map((row) => [row.assignment_id, row.status]));
  const assignmentLoadError = assignmentResult.error || questionRows.error || progressRows.error || submissionRows.error;
  const classNames = new Map(activeMemberships.map((membership) => {
    const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
    return [membership.class_id, classRecord?.name || "Class"];
  }));
  const assignmentCountByClass = new Map<string, number>();
  (assignments ?? []).forEach((assignment) => assignmentCountByClass.set(assignment.class_id, (assignmentCountByClass.get(assignment.class_id) || 0) + 1));
  const accountError = typeof pageSearchParams.error === "string" ? pageSearchParams.error : "";
  const accountSuccess = typeof pageSearchParams.success === "string" ? pageSearchParams.success : "";
  const teacherApprovalRequired = pageSearchParams.teacher === "approval-required";
  const teacherRequested = pageSearchParams.teacher === "requested";

  return (
    <>
      <section className={`dashboard-hero student-dashboard-hero ${isIgcse ? "student-dashboard-hero-igcse" : ""}`}>
        <Container className="dashboard-hero-shell">
          <div className="dashboard-account-row">
            <AccountMenu signOutHref={isIgcse ? "/account?qualification=igcse" : "/account"} />
          </div>
          <div className="dashboard-hero-layout">
            <div className="dashboard-hero-copy">
              <span className="dashboard-role-label">Student dashboard</span>
              <h1>{displayName ? `Welcome back, ${displayName}` : "Your learning dashboard"}</h1>
              <p>Keep up with your classes, assignments and question-bank progress.</p>
            </div>
            <div className="dashboard-hero-stats" aria-label="Student account summary">
              <div><strong>{activeMemberships.length}</strong><span>{activeMemberships.length === 1 ? "class" : "classes"}</span></div>
              <div><strong>{assignments.length}</strong><span>assignments</span></div>
              <div><strong>{coursePercentage}%</strong><span>{progressLabel} progress</span></div>
            </div>
          </div>
        </Container>
      </section>
      <section className={`student-dashboard section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
        <Container className="stack-xl">
          {accountError ? <p className="form-message form-error">{accountError}</p> : null}
          {accountSuccess ? <p className="form-message form-success">{accountSuccess}</p> : null}
          {teacherRequested ? <p className="form-message form-success">Your teacher account request has been sent for approval. You can use the student question bank while you wait.</p> : null}
          {teacherApprovalRequired ? <p className="form-message form-error">{profile?.teacher_status === "pending" ? "Your teacher account is waiting for approval." : "Teacher access must be approved before this account can create classes and assignments."}</p> : null}
          {profile?.teacher_status === "pending" && !teacherRequested ? <p className="teacher-pending-note"><strong>Teacher approval pending</strong><span>You will be able to create classes and assignments once your request is approved.</span></p> : null}
          <section className="student-class-section stack-lg">
            <div className="dashboard-section-heading student-section-heading">
              <div><p className="eyebrow">Classes</p><h2>{activeMemberships.length ? "Your classes" : "Join your first class"}</h2></div>
              <p className="muted">Classes keep your teacher&apos;s assignments and feedback together.</p>
            </div>
            {activeMemberships.length ? <div className="student-class-grid">
              {activeMemberships.map((membership) => {
                const classRecord = Array.isArray(membership.classes) ? membership.classes[0] : membership.classes;
                return <article className="student-class-card" key={membership.class_id}>
                  <div className="student-class-card-top"><DashboardIcon name="class" /><span className="badge">{classRecord?.course}</span></div>
                  <div><small>Class</small><h3>{classRecord?.name || "Your class"}</h3></div>
                  <div className="student-class-card-meta"><span><strong>{assignmentCountByClass.get(membership.class_id) || 0}</strong> assignments</span><span>Joined {new Date(membership.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
                </article>;
              })}
            </div> : <div className="dashboard-empty-state"><DashboardIcon name="add" /><div><strong>No classes joined yet</strong><p>Enter the code shared by your teacher to connect this dashboard to your class.</p></div></div>}
            <details className="join-class-panel" open={!activeMemberships.length}>
              <summary>{activeMemberships.length ? "Join another class" : "Enter a class code"}<span aria-hidden="true">+</span></summary>
              <form action={joinClass} className="join-class-form"><label className="field"><span>Class code</span><input name="code" placeholder="ABC1234" maxLength={10} required /></label><button className="button button-small" type="submit">Join class</button></form>
            </details>
          </section>

          <section className="student-assignments dashboard-panel stack-lg">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Classwork</p><h2>Your assignments</h2></div><p className="muted">Open an assignment to answer questions, save whiteboard working and submit it to your teacher.</p></div>
            {assignmentLoadError ? <p className="form-message form-error">Your assignments could not be refreshed just now. Please reload the page.</p> : null}
            <div className="student-assignment-list">
              {assignments.map((assignment) => {
                const questionCount = questionCountByAssignment.get(assignment.id) || 0;
                const progressCount = progressCountByAssignment.get(assignment.id) || 0;
                const submissionStatus = submissionByAssignment.get(assignment.id);
                const assignmentPercentage = percentage(progressCount, questionCount);
                return <Link className="student-assignment-card" href={`/assignments/${assignment.id}`} key={assignment.id}>
                  <span className="student-assignment-status"><i style={{ width: `${assignmentPercentage}%` }} /></span>
                  <div><small>{classNames.get(assignment.class_id)}</small><strong>{assignment.title}</strong><span>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No due date"}</span></div>
                  <div className="student-assignment-progress"><strong>{progressCount}/{questionCount}</strong><span>questions</span></div>
                  <span className={`status-pill ${submissionStatus === "submitted" ? "is-submitted" : ""}`}>{submissionStatus === "submitted" ? "Submitted" : progressCount ? "Continue" : "Start"}</span>
                  <span aria-hidden="true">→</span>
                </Link>;
              })}
              {!assignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><DashboardIcon name="check" /><div><strong>No assignments yet</strong><p>Your teacher&apos;s assignments will appear here.</p></div></div> : null}
            </div>
          </section>
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
              <div><p className="eyebrow">Topics and subtopics</p><h2>Question-bank progress</h2></div>
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

        </Container>
      </section>
    </>
  );
}
