import type { Metadata } from "next";
import Image from "next/image";
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
import { activePlatformEntitlements, platformAccessSummary, type PlatformEntitlement, type PlatformLicenseSeat } from "@/lib/platform-access";
import { courseProductForCode } from "@/lib/platform-products";
import progressManifest from "@/data/question-bank-progress.json";
import courseVideoAccess from "@/data/course-video-access.json";
import { choosePrimaryCourse, joinClass, requestTeacherAccess } from "./actions";

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
  source?: string | string[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const pageSearchParams = await searchParams;
  const requestedNext = typeof pageSearchParams.next === "string" ? pageSearchParams.next : "";
  const isIgcseJourney = pageSearchParams.qualification === "igcse" || requestedNext.startsWith("/igcse/");
  const isTeacherJourney = requestedNext.startsWith("/teacher") || requestedNext.startsWith("/igcse/teacher");
  const isSignUpJourney = pageSearchParams.mode === "sign-up";
  const isPlusJourney = pageSearchParams.plan === "plus" && !isTeacherJourney;
  const isTeachableJourney = pageSearchParams.source === "teachable" && !isTeacherJourney;
  if (!hasSupabaseBrowserConfig()) {
    return (
      <>
        <PageHero eyebrow={isTeacherJourney ? "Teacher account" : "Student account"} title="Accounts are being prepared" intro="The account service still needs its secure connection before you can sign in." homeHref={isIgcseJourney ? "/igcse" : "/"} homeLabel={isIgcseJourney ? "IGCSE home" : "Home"} />
        <section className="section-tight"><Container className="narrow"><div className="account-card"><p>No student information is being collected yet.</p></div></Container></section>
      </>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const hasSupportingPanel = isTeacherJourney || isTeachableJourney || isPlusJourney;
    const title = isTeacherJourney
      ? isSignUpJourney ? "Create your teacher account" : "Teacher sign in"
      : isTeachableJourney
        ? "Bring your Teachable access across"
      : isPlusJourney
        ? isSignUpJourney ? "Create your account for Plus" : "Sign in to continue to Plus"
        : isSignUpJourney ? "Create your account" : "Welcome back";
    const intro = isTeacherJourney
      ? "Sign in to manage classes and assignments, or create a teacher account to request approval."
      : isTeachableJourney
        ? "Sign in or create an account with the same email address you used on Teachable. After you confirm it, any matching active course is added automatically without another payment."
      : isPlusJourney
        ? "Choose Student or Teacher below to see the right Plus access. Your account keeps course access, lesson progress and question-bank work together."
        : isSignUpJourney
          ? "Choose Student or Teacher, then choose Free or Plus."
          : "Sign in to continue to your learning or teaching space.";
    return (
      <>
        <section className={`account-entry-hero ${isPlusJourney ? "is-plus" : ""} ${isIgcseJourney ? "is-igcse" : ""}`}>
          <Container className="stack-sm"><Eyebrow>{isIgcseJourney ? "IGCSE Mathematics account" : isTeacherJourney ? "Teacher account" : isTeachableJourney ? "Existing Teachable student" : isPlusJourney ? "Mr Flynn IB Plus" : isSignUpJourney ? "Create account" : "Sign in"}</Eyebrow><h1>{title}</h1><p>{isIgcseJourney ? isSignUpJourney ? "Create your account, or sign in with the same email and password you use for Mr Flynn IB." : "Sign in with your Mr Flynn account to open the IGCSE learning or teaching area." : intro}</p></Container>
        </section>
        <section className="section-tight account-entry-section"><Container className="stack-xl">
          <div className={`account-layout ${hasSupportingPanel ? "" : "is-single"}`}><Suspense fallback={<div className="account-card">Loading account…</div>}><StudentAccountForm initialMode={isSignUpJourney ? "sign-up" : "sign-in"} curriculumOverride={isIgcseJourney ? "igcse" : undefined} /></Suspense>{isTeacherJourney ? <aside className="account-benefits stack"><h2>For teachers</h2><ul><li>Create classes and share joining codes.</li><li>Choose questions and set assignments.</li><li>Teacher Plus is optional and follows approval.</li></ul></aside> : isTeachableJourney ? <aside className="account-benefits stack"><h2>No need to buy again</h2><ul><li>Use the email address on your Teachable account.</li><li>Confirm the address if you are creating a new account.</li><li>Your matching active course is then added automatically.</li></ul><p className="small muted">If it does not appear, use Manage access to request a manual check.</p></aside> : isPlusJourney ? <aside className="account-benefits account-plus-benefits stack"><span className="account-plus-mark" aria-hidden="true">+</span><Eyebrow>Plus access</Eyebrow><h2>Mr Flynn IB Plus</h2><p>Complete course access for students and approved teachers.</p><ul><li>Student Plus includes every Free feature.</li><li>Student Plus adds every lesson and its extra practice in one chosen IB course.</li><li>Teacher Plus adds every lesson and its extra practice in all four IB courses after approval.</li></ul><Link className="text-link" href="/learn/index.html?curriculum=ib&amp;view=courses">View the courses</Link></aside> : null}</div>
        </Container></section>
      </>
    );
  }

  if (isTeacherJourney) redirect(requestedNext);

  const requestedCourse = pageSearchParams.course;
  const requestedQualification = typeof pageSearchParams.qualification === "string" ? pageSearchParams.qualification : "";
  const isIgcse = isIgcseJourney || requestedQualification === "igcse";
  const { data: profile } = await supabase.from("profiles").select("role,teacher_status,curriculum").eq("user_id", user.id).maybeSingle();
  await Promise.all([
    supabase.rpc("claim_verified_course_access"),
    supabase.rpc("claim_school_plus_access"),
  ]);
  if (profile?.role === "teacher" || profile?.role === "admin") redirect(isIgcse ? "/igcse/teacher" : "/teacher");
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
                {!requestPending ? <form action={requestTeacherAccess}><input name="curriculum" type="hidden" value={isIgcse ? "igcse" : "ib"} /><button className="button" type="submit">Request teacher access</button></form> : null}
                <Link className="button button-secondary" href={studentDashboardHref}>Return to student dashboard</Link>
              </div>
            </div>
          </Container>
        </section>
      </>
    );
  }

  const [personalAccessResult, schoolAccessResult] = await Promise.all([
    supabase
      .from("platform_entitlements")
      .select("product_code,status,starts_at,expires_at")
      .eq("user_id", user.id),
    supabase
      .from("organization_license_seats")
      .select("revoked_at,organization_licenses(product_code,status,starts_at,ends_at)")
      .eq("user_id", user.id)
      .is("revoked_at", null),
  ]);
  const personalEntitlements = personalAccessResult.data as PlatformEntitlement[] | null;
  const schoolSeats = schoolAccessResult.data as PlatformLicenseSeat[] | null;
  const access = platformAccessSummary(personalEntitlements, schoolSeats);
  const ownedCourseIds = Array.from(new Set(activePlatformEntitlements(personalEntitlements)
    .map((entitlement) => courseProductForCode(entitlement.product_code)?.id)
    .filter((courseId): courseId is "aa-hl" | "aa-sl" | "ai-hl" | "ai-sl" => Boolean(courseId && courseId !== "igcse"))));

  const preferredCourse = typeof user.user_metadata.primary_course === "string" ? user.user_metadata.primary_course : "";
  const requestedPrimaryCourse = getQuestionBankCourse(typeof requestedCourse === "string" ? requestedCourse : "");
  if (!isIgcse && !getQuestionBankCourse(preferredCourse) && ownedCourseIds.length === 1) {
    const inferredCourse = ownedCourseIds[0];
    const existingPreferences = Array.isArray(user.user_metadata.course_preferences)
      ? user.user_metadata.course_preferences.filter((value): value is string => typeof value === "string")
      : [];
    const { error: courseSaveError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        primary_course: inferredCourse,
        course_preferences: Array.from(new Set([inferredCourse, ...existingPreferences])),
      },
    });
    if (!courseSaveError) redirect(`/account?course=${inferredCourse}`);
  }
  if (!isIgcse && !getQuestionBankCourse(preferredCourse)) {
    return <>
      <section className="account-course-setup-hero">
        <Container className="account-course-setup-hero-inner">
          <div className="stack-sm"><Eyebrow>Complete your learning home</Eyebrow><h1>Which IB Mathematics course are you studying?</h1><p>Your existing account and saved work stay exactly as they are. This choice simply opens the right course, question bank and progress view first.</p></div>
          <AccountMenu signOutHref="/account" />
        </Container>
      </section>
      <section className="section-tight account-course-setup-section"><Container className="narrow">
        <form className="account-course-setup-card stack-lg" action={choosePrimaryCourse}>
          {accountError ? <p className="form-message form-error">{accountError}</p> : null}
          <fieldset className="account-course-field">
            <legend>Choose your main course</legend>
            <div className="account-course-options is-single">
              {questionBankCourses.map((course) => <label className={requestedPrimaryCourse?.slug === course.slug ? "is-selected" : ""} key={course.slug}>
                <input defaultChecked={requestedPrimaryCourse?.slug === course.slug} name="courseId" required type="radio" value={course.slug} />
                <span><strong>{course.code}</strong><small>{course.pathway} · {course.level}</small></span>
              </label>)}
            </div>
          </fieldset>
          <div className="account-course-setup-actions">
            <button className="button" name="destination" type="submit" value="home">Continue to my learning home</button>
            <button className="button button-secondary" name="destination" type="submit" value="plus">Continue to Plus options</button>
          </div>
          <p className="small muted"><strong>One account, whichever route you choose.</strong> Starting free does not prevent you upgrading later. If you already have verified paid or school access, it remains attached to this account.</p>
        </form>
      </Container></section>
    </>;
  }
  const selectedCourse = getQuestionBankCourse(preferredCourse) ?? getQuestionBankCourse(typeof requestedCourse === "string" ? requestedCourse : "") ?? questionBankCourses[0];
  const courseLearningHref = isIgcse ? "/igcse/learn" : `/learn?course=${selectedCourse.slug}`;
  const courseProgress = isIgcse ? progressManifest.igcse : progressManifest.courses[selectedCourse.code];
  const bank = isIgcse ? "igcse" : "ib";
  const questionBankHref = isIgcse ? "/igcse/question-bank" : `/question-bank/${selectedCourse.slug}`;
  const progressLabel = isIgcse ? "IGCSE" : selectedCourse.code;
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
  const [completedQuestionIds, { count: whiteboardCount }, { data: memberships }, { data: lessonProgressRows }, { data: coursePlatformState }] = await Promise.all([
    completedQuestionIdsPromise,
    whiteboardCountPromise,
    membershipsPromise,
    supabase.from("course_lesson_progress").select("lesson_id,completed,last_viewed_at").eq("user_id", user.id).eq("curriculum", isIgcse ? "igcse" : "ib").eq("course_id", isIgcse ? "igcse" : selectedCourse.slug),
    supabase.from("course_platform_state").select("last_lesson_id").eq("user_id", user.id).eq("curriculum", isIgcse ? "igcse" : "ib").maybeSingle(),
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
  const courseManifestKey = isIgcse ? "igcse" : selectedCourse.slug;
  const courseManifest = courseVideoAccess.courses[courseManifestKey];
  const availableLessonIds = access.paid ? courseManifest.lessons : courseManifest.samples;
  const completedLessonIds = new Set((lessonProgressRows ?? []).filter((row) => row.completed).map((row) => row.lesson_id));
  const completedLessons = availableLessonIds.filter((lessonId) => completedLessonIds.has(lessonId)).length;
  const courseLessonPercentage = percentage(completedLessons, availableLessonIds.length);
  const courseLessonLabel = access.paid ? "course lessons" : "free lessons";
  const lastLessonAvailable = Boolean(coursePlatformState?.last_lesson_id && availableLessonIds.includes(coursePlatformState.last_lesson_id));
  return (
    <>
      <section className={`dashboard-hero student-dashboard-hero student-home-v2-hero ${isIgcse ? "student-dashboard-hero-igcse" : ""}`}>
        <Container className="dashboard-hero-shell">
          <div className="dashboard-account-row">
            <div className={`platform-access-summary ${access.paid ? "is-paid" : ""}`}>
              <span>{access.label}</span>
              <small>{access.detail}</small>
              <Link href={upgradeHref}>{access.paid ? "Manage access" : isIgcse ? "Course access" : "Explore course access"}</Link>
            </div>
            <AccountMenu signOutHref={isIgcse ? "/igcse/account" : "/account"} />
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
            <div className="student-home-course-chip">
              <span>Current course</span>
              <strong>{progressLabel}</strong>
              <small>{isIgcse ? "IGCSE Mathematics" : `${selectedCourse.pathway} ${selectedCourse.level}`}</small>
            </div>
          </div>
        </Container>
      </section>
      <section className={`student-dashboard student-home-v2 section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
        <Container className="stack-2xl">
          {accountError ? <p className="form-message form-error">{accountError}</p> : null}
          {accountSuccess ? <p className="form-message form-success">{accountSuccess}</p> : null}
          {teacherApprovalPending ? (
            <p className="teacher-pending-note">
              <strong>Teacher status: waiting approval</strong>
              <span>You do not need to apply again. Once approved, this account will open your teacher dashboard automatically.</span>
            </p>
          ) : null}
          <section className="student-focus-grid" aria-labelledby="student-focus-heading">
            <article className="student-focus-primary">
              <div className="student-focus-top"><span className="student-focus-label">{nextAssignment ? "Your next task" : "You're up to date"}</span>{nextAssignment?.due_at ? <span className="student-due-pill">{dueDateLabel(nextAssignment.due_at)}</span> : null}</div>
              <div className="student-focus-copy">
                <span>{nextAssignment ? classNames.get(nextAssignment.class_id) : progressLabel}</span>
                <h2 id="student-focus-heading">{nextAssignment?.title || "Choose what to practise next"}</h2>
                <p>{nextAssignment ? nextAssignment.progressCount ? `${nextAssignment.progressCount} of ${nextAssignment.questionCount} questions complete.` : `${nextAssignment.questionCount} ${nextAssignment.questionCount === 1 ? "question" : "questions"} ready to begin.` : "There are no assignments waiting. Continue independently in the question bank."}</p>
              </div>
              <div className="student-focus-footer">
                <div><span><strong>{nextAssignment ? `${nextAssignment.progressCount} of ${nextAssignment.questionCount}` : `${courseCompleted.toLocaleString("en-GB")} completed`}</strong> {nextAssignment ? "questions" : "question-bank questions"}</span><i><b style={{ width: `${nextAssignment?.assignmentPercentage ?? coursePercentage}%` }} /></i></div>
                <Link className="button student-focus-button" href={nextAssignment ? `/assignments/${nextAssignment.id}` : continueLearningHref}>{nextAssignment ? nextAssignment.progressCount ? "Continue assignment" : "Start assignment" : "Continue practising"} <span aria-hidden="true">→</span></Link>
              </div>
            </article>
            <article className="student-continue-card">
              <div className="student-continue-copy"><span className="student-focus-label">Continue learning</span><small>{progressLabel}</small><h2>{lastLessonAvailable ? "Continue your last lesson" : "Open your course"}</h2><p>{access.paid ? "Every video lesson and its extra practice are unlocked." : "Three complete lessons in every topic are free."}</p><Link className="student-inline-action" href={courseLearningHref}>{lastLessonAvailable ? "Continue course" : "Choose a lesson"} <span aria-hidden="true">→</span></Link></div>
              {!isIgcse ? <Image src={`/learn/assets/course-${selectedCourse.slug}.png`} alt="" width={250} height={250} /> : <div className="student-continue-symbol student-continue-igcse" aria-hidden="true"><strong>IGCSE</strong><span>Mathematics</span></div>}
              <div className="student-continue-meter"><span><strong>{completedLessons} of {availableLessonIds.length}</strong> {courseLessonLabel} complete</span><i><b style={{ width: `${courseLessonPercentage}%` }} /></i></div>
            </article>
          </section>

          <nav className="student-platform-nav student-platform-nav-v2" aria-label="Your learning areas">
            <Link className="is-course" href={courseLearningHref}><DashboardIcon name="book" /><span><strong>My course</strong><small>{isIgcse ? "Lessons and past-paper solutions" : `${selectedCourse.code} lessons and past-paper solutions`}</small></span><b aria-hidden="true">→</b></Link>
            <Link className="is-question-bank" href={questionBankHref}><DashboardIcon name="progress" /><span><strong>Question bank</strong><small>All questions free</small></span><b aria-hidden="true">→</b></Link>
            <Link className="is-assignments" href="#assignments"><DashboardIcon name="assignment" /><span><strong>Assignments</strong><small>{activeAssignments.length ? `${activeAssignments.length} ${activeAssignments.length === 1 ? "task" : "tasks"} due` : "No work due"}</small></span><b aria-hidden="true">↓</b></Link>
            <Link className="is-progress" href="#progress"><DashboardIcon name="check" /><span><strong>My progress</strong><small>Course and questions</small></span><b aria-hidden="true">↓</b></Link>
          </nav>

          <section className="student-assignments student-home-section stack-lg" id="assignments">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Assignments</p><h2>{activeAssignments.length ? "Due soon" : "You're up to date"}</h2></div><p className="muted">Your current work is ordered by due date, so the most important task is always easy to find.</p></div>
            {assignmentLoadError ? <p className="form-message form-error">Your assignments could not be refreshed just now. Please reload the page.</p> : null}
            <div className="student-assignment-list">
              {activeAssignments.map((assignment, assignmentIndex) => {
                return <Link className={`student-assignment-card ${assignmentIndex === 0 ? "is-urgent" : ""}`} href={`/assignments/${assignment.id}`} key={assignment.id}>
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

          <section className="student-progress-overview student-home-section stack-lg" id="progress" aria-labelledby="student-progress-heading">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Personal progress</p><h2 id="student-progress-heading">Your progress</h2></div><p className="muted">Course lessons and question-bank practice are shown separately, so each number is meaningful.</p></div>
            <div className="student-progress-grid student-progress-grid-v2">
              <article className="student-progress-summary is-course-progress">
                <div><p className="student-dashboard-kicker">{access.paid ? "Course progress" : "Free course preview"}</p><strong className="student-progress-number">{completedLessons} of {availableLessonIds.length}</strong><span>{isIgcse ? "IGCSE Mathematics" : `${selectedCourse.pathway} ${selectedCourse.level}`}</span></div>
                <div className="student-progress-ring" style={{ "--student-progress": `${courseLessonPercentage * 3.6}deg` } as CSSProperties}><span>{courseLessonPercentage}%</span></div>
                <dl><div><dt>Lessons completed</dt><dd>{completedLessons}</dd></div><div><dt>{access.paid ? "Lessons remaining" : "Free lessons remaining"}</dt><dd>{Math.max(0, availableLessonIds.length - completedLessons)}</dd></div><div><dt>Access</dt><dd>{access.paid ? "Plus" : "Free"}</dd></div></dl>
                <Link className="student-inline-action" href={courseLearningHref}>Continue course →</Link>
              </article>
              <article className="student-progress-summary is-bank-progress">
                <div><p className="student-dashboard-kicker">Question bank progress</p><strong className="student-progress-number">{courseCompleted.toLocaleString("en-GB")}</strong><span>questions completed</span></div>
                <div className="student-progress-ring" style={{ "--student-progress": `${coursePercentage * 3.6}deg` } as CSSProperties}><span>{coursePercentage}%</span></div>
                <dl><div><dt>Bank explored</dt><dd>{coursePercentage}%</dd></div><div><dt>Saved whiteboards</dt><dd>{whiteboardCount ?? 0}</dd></div><div><dt>Assignments submitted</dt><dd>{completedAssignments.length}</dd></div></dl>
                <Link className="student-inline-action" href={continueLearningHref}>Continue practising →</Link>
              </article>
            </div>
          </section>

          <section className="student-learning-section stack-lg" id="question-bank-progress">
            <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Independent practice</p><h2>Continue learning</h2></div><p className="muted">Pick up where you left off, or choose a topic to practise at your own pace.</p></div>
          {isIgcse ? (
            <div className="dashboard-course-bar dashboard-course-bar-single">
              <div><span>Your question bank</span><strong>IGCSE Mathematics</strong></div>
            </div>
          ) : (
            <div className="dashboard-course-bar dashboard-course-bar-single">
              <div>
                <span>Your question bank</span>
                <strong>{selectedCourse.code} · {selectedCourse.pathway} {selectedCourse.level}</strong>
              </div>
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

          <section className="student-resource-row" aria-label="More ways to learn">
            <Link className="student-resource-card is-papers" href={`${courseLearningHref}${courseLearningHref.includes("?") ? "&" : "?"}view=past-papers`}><span className="student-resource-icon" aria-hidden="true">P</span><span><small>Exam preparation</small><strong>Past-paper solutions</strong><em>{isIgcse ? "Work through exam-style questions" : "Specimen and May 2021 are free"}</em></span><b aria-hidden="true">→</b></Link>
            <Link className="student-resource-card is-saved" href={questionBankHref}><span className="student-resource-icon" aria-hidden="true">{whiteboardCount ?? 0}</span><span><small>Your work</small><strong>Saved whiteboards</strong><em>Continue from any device</em></span><b aria-hidden="true">→</b></Link>
          </section>

          <section className="student-class-section student-home-section stack-lg">
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

          {!access.paid && !isIgcse ? <section className="platform-review-upgrade student-upgrade-v2"><div><span className="platform-review-card-label">Free account</span><h2>Ready for Mr Flynn IB Plus?</h2><p>Your complete question bank, classes and assignments stay free. Plus unlocks every video lesson and the complete set of extra practice questions inside the lessons.</p></div><Link className="button button-secondary" href={upgradeHref}>See Plus access</Link></section> : null}

        </Container>
      </section>
    </>
  );
}
