import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { Container, Eyebrow, PageHero } from "@/components/ui";
import { DashboardIcon } from "@/components/dashboard-icon";
import { AccountMenu } from "@/components/account-menu";
import { StudentAccountForm } from "@/components/student-account-form";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { getQuestionBankCourse, questionBankCourses } from "@/lib/question-bank-courses";
import { platformAccessSummary, type PlatformEntitlement, type PlatformLicenseSeat } from "@/lib/platform-access";
import { getCourseProduct } from "@/lib/platform-products";
import progressManifest from "@/data/question-bank-progress.json";
import { joinClass, requestTeacherAccess } from "./actions";

export const metadata: Metadata = {
  title: "Mr Flynn IB account",
  description: "Sign in to your student or teacher account.",
  robots: { index: false, follow: false },
};

function percentage(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

function dueDateLabel(dueAt: string | null) {
  if (!dueAt) return "No due date";
  const dueDate = new Date(dueAt);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const daysAway = Math.round((startOfDueDate - startOfToday) / 86_400_000);

  if (daysAway < 0) return `${Math.abs(daysAway)} ${Math.abs(daysAway) === 1 ? "day" : "days"} overdue`;
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  if (daysAway <= 7) return `Due in ${daysAway} days`;
  return `Due ${dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

type AccountSearchParams = {
  course?: string | string[];
  qualification?: string | string[];
  next?: string | string[];
  error?: string | string[];
  success?: string | string[];
  teacher?: string | string[];
  mode?: string | string[];
  plan?: string | string[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const pageSearchParams = await searchParams;
  const requestedNext = typeof pageSearchParams.next === "string" ? pageSearchParams.next : "";
  const isTeacherJourney = requestedNext.startsWith("/teacher") || requestedNext.startsWith("/igcse/teacher");
  const isSignUpJourney = pageSearchParams.mode === "sign-up";
  const isPlusJourney = pageSearchParams.plan === "plus" && !isTeacherJourney;
  const requestedPlusCourse = getCourseProduct(typeof pageSearchParams.course === "string" ? pageSearchParams.course : "");
  const plusCourse = requestedPlusCourse?.curriculum === "ib" ? requestedPlusCourse : undefined;
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
    const title = isTeacherJourney
      ? isSignUpJourney ? "Create your teacher account" : "Teacher sign in"
      : isPlusJourney
        ? isSignUpJourney ? "Create your account for Plus" : "Sign in to continue to Plus"
        : isSignUpJourney ? "Create your free account" : "Welcome back";
    const intro = isTeacherJourney
      ? "Sign in to manage classes and assignments, or create a teacher account to request approval."
      : isPlusJourney
        ? `${plusCourse ? `${plusCourse.shortTitle} selected. ` : ""}Your account keeps your course access, lesson progress and question-bank work together.`
        : isSignUpJourney
          ? "Save question-bank progress, whiteboards, classes and assignments without paying for a course."
          : "Sign in to continue your courses, question bank, classes and saved work.";
    return (
      <>
        <section className={`account-entry-hero ${isPlusJourney ? "is-plus" : ""}`}>
          <Container className="stack-sm"><Eyebrow>{isTeacherJourney ? "Teacher account" : isPlusJourney ? "Mr Flynn IB Plus" : "Mr Flynn IB account"}</Eyebrow><h1>{title}</h1><p>{intro}</p></Container>
        </section>
        <section className="section-tight account-entry-section"><Container className="stack-xl">
          {!isTeacherJourney && isSignUpJourney ? <nav className="account-plan-switch" aria-label="Choose account type">
            <Link className={!isPlusJourney ? "is-selected" : ""} href="/account?mode=sign-up"><span>Free account</span><strong>Question bank, whiteboards, classes and assignments</strong><small>Free</small></Link>
            <Link className={isPlusJourney ? "is-selected is-plus" : "is-plus"} href={plusCourse ? `/plus?course=${plusCourse.id}` : "/plus"}><span>Mr Flynn IB Plus</span><strong>Every course lesson and its extra practice</strong><small>$79 · 2 years</small></Link>
          </nav> : null}
          <div className="account-layout"><Suspense fallback={<div className="account-card">Loading account…</div>}><StudentAccountForm initialMode={isSignUpJourney ? "sign-up" : "sign-in"} /></Suspense>{isTeacherJourney ? <aside className="account-benefits stack"><h2>For teachers</h2><ul><li>Create classes and share joining codes.</li><li>Choose questions and set assignments.</li></ul></aside> : isPlusJourney ? <aside className="account-benefits account-plus-benefits stack"><span className="account-plus-mark" aria-hidden="true">+</span><Eyebrow>Selected access</Eyebrow><h2>{plusCourse ? plusCourse.shortTitle : "Mr Flynn IB Plus"}</h2><p>{plusCourse?.title || "Choose your course after creating your account."}</p><ul><li>Every video lesson in the selected course.</li><li>All extra practice attached to those lessons.</li><li>One payment with no automatic renewal.</li></ul><Link className="text-link" href="/learn?view=courses">Choose a different course</Link></aside> : <aside className="account-benefits stack"><h2>Your free learning account</h2><ul><li>Save completed question-bank questions.</li><li>Return to editable whiteboard working later.</li><li>Join classes and complete assignments.</li></ul></aside>}</div>
        </Container></section>
      </>
    );
  }

  if (isTeacherJourney) redirect(requestedNext);

  const requestedCourse = pageSearchParams.course;
  const requestedQualification = typeof pageSearchParams.qualification === "string" ? pageSearchParams.qualification : "";
  const isIgcse = requestedQualification === "igcse" || requestedNext.startsWith("/igcse/");
  const { data: profile } = await supabase.from("profiles").select("role,teacher_status,curriculum").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.curriculum && profile.curriculum !== (isIgcse ? "igcse" : "ib")) {
    const destination = profile.curriculum === "igcse" ? "/account?qualification=igcse&" : "/account?";
    redirect(`${destination}error=${encodeURIComponent("IB and IGCSE use separate accounts. Sign out before entering the other account area.")}`);
  }
  if (profile?.role === "teacher" || profile?.role === "admin") redirect(isIgcse ? "/igcse/teacher" : "/teacher");
  await supabase.rpc("claim_verified_course_access");
  const accountError = typeof pageSearchParams.error === "string" ? pageSearchParams.error : "";
  const accountSuccess = typeof pageSearchParams.success === "string" ? pageSearchParams.success : "";
  const teacherApprovalRequired = pageSearchParams.teacher === "approval-required";
  const teacherRequested = pageSearchParams.teacher === "requested";
  const teacherApprovalPending = profile?.teacher_status === "pending";

  if (teacherApprovalRequired || teacherRequested) {
    const requestPending = profile?.teacher_status === "pending" || teacherRequested;
    const studentDashboardHref = isIgcse ? "/igcse/account" : "/account";

    return (
      <>
        <PageHero
          eyebrow={isIgcse ? "IGCSE teacher access" : "Teacher access"}
          title={requestPending ? "Teacher access requested" : "Looking for the teacher dashboard?"}
          intro={requestPending
            ? "Your request is waiting for approval. You can continue using your student dashboard while it is reviewed."
            : "Your account is currently set up as a student. You can request teacher access using this same account."}
        />
        <section className="section-tight">
          <Container className="narrow">
            <div className="account-card teacher-access-gate stack-lg">
              {accountError ? <p className="form-message form-error">{accountError}</p> : null}
              <div className="stack-sm">
                <h2>{requestPending ? "What happens next?" : "Keep everything in one account"}</h2>
                <p>{requestPending
                  ? "Once an administrator approves the request, this account will open the teacher dashboard."
                  : "Your question-bank progress and saved work will remain in place. Your account will stay as a student account until an administrator approves the request."}</p>
              </div>
              {requestPending ? <p className="teacher-pending-note"><strong>Approval pending</strong><span>No further action is needed. You can return here to check the status.</span></p> : null}
              <div className="teacher-access-gate-actions">
                {!requestPending ? <form action={requestTeacherAccess}><button className="button" type="submit">Request teacher access</button></form> : null}
                <Link className="button button-secondary" href={studentDashboardHref}>Return to student dashboard</Link>
              </div>
            </div>
          </Container>
        </section>
      </>
    );
  }

  const preferredCourse = typeof user.user_metadata.primary_course === "string" ? user.user_metadata.primary_course : "";
  const selectedCourse = getQuestionBankCourse(typeof requestedCourse === "string" ? requestedCourse : "") ?? getQuestionBankCourse(preferredCourse) ?? questionBankCourses[0];
  const courseProgress = isIgcse ? progressManifest.igcse : progressManifest.courses[selectedCourse.code];
  const bank = isIgcse ? "igcse" : "ib";
  const questionBankHref = isIgcse ? "/igcse/question-bank" : `/question-bank/${selectedCourse.slug}`;
  const progressLabel = isIgcse ? "IGCSE" : selectedCourse.code;
  const accessPromise = Promise.all([
    supabase
      .from("platform_entitlements")
      .select("product_code,status,starts_at,expires_at")
      .eq("user_id", user.id),
    supabase
      .from("organization_license_seats")
      .select("revoked_at,organization_licenses(product_code,status,starts_at,ends_at)")
      .eq("user_id", user.id)
      .is("revoked_at", null),
  ]).then(([personalResult, schoolResult]) => platformAccessSummary(
    personalResult.data as PlatformEntitlement[] | null,
    schoolResult.data as PlatformLicenseSeat[] | null,
  ));
  const upgradeHref = isIgcse ? "/igcse/account/access" : "/account/access";
  const completedQuestionIdsPromise = (async () => {
    const completedQuestionIds = new Set<string>();
    let pageStart = 0;

    while (true) {
      const { data, error } = await supabase
        .from("question_progress")
        .select("question_id")
        .eq("user_id", user.id)
        .eq("bank", bank)
        .eq("completed", true)
        .range(pageStart, pageStart + 999);
      if (error || !data) break;
      data.forEach((row) => completedQuestionIds.add(row.question_id));
      if (data.length < 1000) break;
      pageStart += 1000;
    }

    return completedQuestionIds;
  })();
  const whiteboardCountPromise = supabase
    .from("whiteboard_documents")
    .select("question_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("bank", bank);
  const membershipsPromise = supabase
    .from("class_memberships")
    .select("class_id,joined_at,classes(id,name,course,bank)")
    .eq("student_id", user.id);
  const [access, completedQuestionIds, { count: whiteboardCount }, { data: memberships }] = await Promise.all([
    accessPromise,
    completedQuestionIdsPromise,
    whiteboardCountPromise,
    membershipsPromise,
  ]);
  const courseCompleted = courseProgress.questionIds.filter((id) => completedQuestionIds.has(id)).length;
  const coursePercentage = percentage(courseCompleted, courseProgress.questionIds.length);
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";
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
  const studentAssignments = assignments.map((assignment) => {
    const questionCount = questionCountByAssignment.get(assignment.id) || 0;
    const progressCount = progressCountByAssignment.get(assignment.id) || 0;
    const submissionStatus = submissionByAssignment.get(assignment.id);
    return {
      ...assignment,
      questionCount,
      progressCount,
      submissionStatus,
      assignmentPercentage: percentage(progressCount, questionCount),
    };
  });
  const activeAssignments = studentAssignments
    .filter((assignment) => assignment.submissionStatus !== "submitted")
    .sort((first, second) => {
      if (!first.due_at && !second.due_at) return 0;
      if (!first.due_at) return 1;
      if (!second.due_at) return -1;
      return new Date(first.due_at).getTime() - new Date(second.due_at).getTime();
    });
  const completedAssignments = studentAssignments.filter((assignment) => assignment.submissionStatus === "submitted");
  const nextAssignment = activeAssignments[0];
  const firstIncompleteTopic = courseProgress.topics.find((topic) => topic.questionIds.some((id) => !completedQuestionIds.has(id)));
  const firstIncompleteSubtopic = firstIncompleteTopic?.subtopics.find((subtopic) => subtopic.questionIds.some((id) => !completedQuestionIds.has(id)));
  const continueLearningHref = firstIncompleteTopic && firstIncompleteSubtopic
    ? isIgcse
      ? `/igcse/question-bank?topic=${encodeURIComponent(firstIncompleteTopic.name)}&subtopic=${encodeURIComponent(firstIncompleteSubtopic.name)}`
      : `/question-bank/${selectedCourse.slug}?topic=${encodeURIComponent(firstIncompleteTopic.name)}&subtopic=${encodeURIComponent(firstIncompleteSubtopic.name)}`
    : questionBankHref;
  return (
    <>
      <section className={`dashboard-hero student-dashboard-hero ${isIgcse ? "student-dashboard-hero-igcse" : ""}`}>
        <Container className="dashboard-hero-shell">
          <div className="dashboard-account-row">
            <div className={`platform-access-summary ${access.paid ? "is-paid" : ""}`}>
              <span>{access.label}</span>
              <small>{access.detail}</small>
              <Link href={upgradeHref}>{access.paid ? "Manage access" : "Explore course access"}</Link>
            </div>
            <AccountMenu signOutHref={isIgcse ? "/account?qualification=igcse" : "/account"} />
          </div>
          <div className="dashboard-hero-layout">
            <div className="dashboard-hero-copy">
              <span className="dashboard-role-label">
                {teacherApprovalPending ? "Teacher status: waiting approval" : "My learning"}
              </span>
              <h1>{displayName ? `Welcome back, ${displayName}` : "Your learning dashboard"}</h1>
              <p>
                {teacherApprovalPending
                  ? "Your teacher account is being reviewed. You can use the question bank while you wait."
                  : "Here's what to focus on next."}
              </p>
            </div>
          </div>
        </Container>
      </section>
      <section className={`student-dashboard section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
        <Container className="stack-xl">
          {accountError ? <p className="form-message form-error">{accountError}</p> : null}
          {accountSuccess ? <p className="form-message form-success">{accountSuccess}</p> : null}
          {teacherApprovalPending ? (
            <p className="teacher-pending-note">
              <strong>Teacher status: waiting approval</strong>
              <span>You do not need to apply again. Once approved, this account will open your teacher dashboard automatically.</span>
            </p>
          ) : null}
          <nav className="student-platform-nav" aria-label="Your learning areas">
            <Link href={isIgcse ? "/igcse/learn" : "/learn"}><DashboardIcon name="book" /><span><strong>Courses</strong><small>Lessons and past-paper solutions</small></span><b aria-hidden="true">→</b></Link>
            <Link href={questionBankHref}><DashboardIcon name="progress" /><span><strong>Question bank</strong><small>Independent practice and saved work</small></span><b aria-hidden="true">→</b></Link>
            <Link href="#assignments"><DashboardIcon name="assignment" /><span><strong>Assignments</strong><small>Work set by your teachers</small></span><b aria-hidden="true">↓</b></Link>
            <Link href="#question-bank-progress"><DashboardIcon name="check" /><span><strong>Progress</strong><small>Your learning at a glance</small></span><b aria-hidden="true">↓</b></Link>
          </nav>
          <div className="student-next-grid">
            <section className="student-next-card">
              <div className="student-next-card-copy">
                <p className="student-dashboard-kicker">Up next</p>
                {nextAssignment ? <>
                  <span className="student-next-context">{classNames.get(nextAssignment.class_id)} · {dueDateLabel(nextAssignment.due_at)}</span>
                  <h2>{nextAssignment.title}</h2>
                  <p>{nextAssignment.progressCount ? `You have completed ${nextAssignment.progressCount} of ${nextAssignment.questionCount} questions.` : `${nextAssignment.questionCount} ${nextAssignment.questionCount === 1 ? "question" : "questions"} ready to begin.`}</p>
                </> : <>
                  <span className="student-next-context">You&apos;re up to date</span>
                  <h2>All caught up</h2>
                  <p>{assignments.length ? "You have submitted all of your current assignments." : "There are no assignments waiting for you."}</p>
                </>}
              </div>
              {nextAssignment ? <>
                <div className="student-next-progress"><span><strong>{nextAssignment.assignmentPercentage}%</strong> complete</span><i><b style={{ width: `${nextAssignment.assignmentPercentage}%` }} /></i></div>
                <Link className="button student-next-button" href={`/assignments/${nextAssignment.id}`}>{nextAssignment.progressCount ? "Continue assignment" : "Start assignment"}<span aria-hidden="true">→</span></Link>
              </> : <Link className="button student-next-button" href={continueLearningHref}>Practise in the question bank<span aria-hidden="true">→</span></Link>}
            </section>

            <aside className="student-progress-summary" aria-label="Your progress">
              <div><p className="student-dashboard-kicker">Personal progress</p><strong className="student-progress-number">{coursePercentage}%</strong><span>{progressLabel} question bank complete</span></div>
              <div className="student-progress-ring" style={{ "--student-progress": `${coursePercentage * 3.6}deg` } as CSSProperties}><span>{coursePercentage}%</span></div>
              <dl>
                <div><dt>Questions completed</dt><dd>{courseCompleted.toLocaleString("en-GB")}</dd></div>
                <div><dt>Saved whiteboards</dt><dd>{whiteboardCount ?? 0}</dd></div>
                <div><dt>Assignments submitted</dt><dd>{completedAssignments.length}</dd></div>
              </dl>
            </aside>
          </div>

          <section className="student-assignments dashboard-panel stack-lg" id="assignments">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Assignments</p><h2>{activeAssignments.length ? "Due soon" : "You're up to date"}</h2></div><p className="muted">Your current work is ordered by due date, so the most important task is always easy to find.</p></div>
            {assignmentLoadError ? <p className="form-message form-error">Your assignments could not be refreshed just now. Please reload the page.</p> : null}
            <div className="student-assignment-list">
              {activeAssignments.map((assignment) => {
                return <Link className="student-assignment-card" href={`/assignments/${assignment.id}`} key={assignment.id}>
                  <span className="student-assignment-status"><i style={{ width: `${assignment.assignmentPercentage}%` }} /></span>
                  <div><small>{classNames.get(assignment.class_id)}</small><strong>{assignment.title}</strong><span>{dueDateLabel(assignment.due_at)}</span></div>
                  <div className="student-assignment-progress"><strong>{assignment.progressCount}/{assignment.questionCount}</strong><span>questions</span></div>
                  <span className="status-pill">{assignment.progressCount ? "Continue" : "Start"}</span>
                  <span aria-hidden="true">→</span>
                </Link>;
              })}
              {!activeAssignments.length && !assignmentLoadError ? <div className="dashboard-empty-state compact"><DashboardIcon name="check" /><div><strong>{assignments.length ? "Everything is submitted" : "No assignments yet"}</strong><p>{assignments.length ? "Nice work. Your next assignment will appear here when it is set." : "Your teacher's assignments will appear here."}</p></div></div> : null}
            </div>
            {completedAssignments.length ? <details className="student-completed-assignments"><summary>Submitted assignments ({completedAssignments.length})<span aria-hidden="true">+</span></summary><div className="student-assignment-list">{completedAssignments.map((assignment) => <Link className="student-assignment-card is-complete" href={`/assignments/${assignment.id}`} key={assignment.id}><span className="student-assignment-status"><i style={{ width: "100%" }} /></span><div><small>{classNames.get(assignment.class_id)}</small><strong>{assignment.title}</strong><span>Submitted</span></div><div className="student-assignment-progress"><strong>{assignment.progressCount}/{assignment.questionCount}</strong><span>questions</span></div><span className="status-pill is-submitted">Submitted</span><span aria-hidden="true">→</span></Link>)}</div></details> : null}
          </section>

          <section className="student-learning-section stack-lg" id="question-bank-progress">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Independent practice</p><h2>Continue learning</h2></div><p className="muted">Pick up where you left off, or choose a topic to practise at your own pace.</p></div>
          {isIgcse ? (
            <div className="dashboard-course-bar dashboard-course-bar-single">
              <div><span>Your question bank</span><strong>IGCSE Mathematics</strong></div>
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

          <div className="dashboard-overview student-learning-overview">
            <div className="dashboard-overview-title">
              <span>{firstIncompleteSubtopic ? "Suggested next topic" : `${progressLabel} progress`}</span>
              <strong>{firstIncompleteSubtopic?.name || `${courseCompleted.toLocaleString("en-GB")} of ${courseProgress.questionIds.length.toLocaleString("en-GB")} questions completed`}</strong>
            </div>
            <div className="dashboard-progress" aria-label={`${coursePercentage}% complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={coursePercentage} role="progressbar">
              <span style={{ width: `${coursePercentage}%` }} />
            </div>
            <div className="dashboard-overview-meta"><strong>{coursePercentage}%</strong><span>{whiteboardCount ?? 0} saved whiteboards</span></div>
            <Link className="button button-small" href={continueLearningHref}>Continue learning</Link>
          </div>

          <div className="dashboard-topics stack-lg">
            <div className="dashboard-section-heading">
              <div><p className="eyebrow">Topics and subtopics</p><h2>Explore your course</h2></div>
              <p className="muted">Open a topic to see your progress and go straight to a subtopic.</p>
            </div>
            <div className="dashboard-topic-list">
              {courseProgress.topics.map((topic, topicIndex) => {
                const topicCompleted = topic.questionIds.filter((id) => completedQuestionIds.has(id)).length;
                const topicPercentage = percentage(topicCompleted, topic.questionIds.length);
                return (
                  <details className="dashboard-topic" key={topic.name}>
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
          </section>

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

        </Container>
      </section>
    </>
  );
}
