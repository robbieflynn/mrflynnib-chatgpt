import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { DashboardIcon } from "@/components/dashboard-icon";

export const metadata: Metadata = {
  title: "Connected platform review",
  robots: { index: false, follow: false },
};

type ReviewSearchParams = {
  curriculum?: string | string[];
  role?: string | string[];
  screen?: string | string[];
};

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : "";
}

function reviewHref(curriculum: "ib" | "igcse", role: "student" | "teacher", screen = "home") {
  return `/platform-review?curriculum=${curriculum}&role=${role}&screen=${screen}`;
}

function ReviewBar({ curriculum, role }: { curriculum: "ib" | "igcse"; role: "student" | "teacher" }) {
  return (
    <div className={`platform-review-bar ${curriculum === "igcse" ? "is-igcse" : ""}`}>
      <Container className="platform-review-bar-inner">
        <span><strong>Private platform walkthrough</strong><small>Example data only</small></span>
        <nav aria-label="Choose a walkthrough">
          <Link aria-current={role === "student" ? "page" : undefined} href={reviewHref(curriculum, "student")}>Student view</Link>
          <Link aria-current={role === "teacher" ? "page" : undefined} href={reviewHref(curriculum, "teacher")}>Teacher view</Link>
        </nav>
      </Container>
    </div>
  );
}

function StudentHome({ curriculum }: { curriculum: "ib" | "igcse" }) {
  const isIgcse = curriculum === "igcse";
  const courseCode = isIgcse ? "IGCSE" : "AA HL";
  const className = isIgcse ? "Year 11 IGCSE" : "Year 12 AA HL";
  const courseName = isIgcse ? "Edexcel IGCSE Mathematics" : "Analysis & Approaches HL";
  const continueTopic = isIgcse ? "Topic 1 · Number" : "Topic 1 · Number and algebra";
  const continueLesson = isIgcse ? "Surds (Expanding Brackets)" : "More exponents";
  const continueDetail = "Free lesson · Video and practice included";
  const freeLessonCount = isIgcse ? 18 : 15;
  const freeLessonPercentage = isIgcse ? 6 : 7;
  const freeLessonProgress = isIgcse ? "22deg" : "25deg";
  const courseReviewHref = isIgcse ? "/learn/index.html?v=igcse-platform-review" : "/learn/index.html?v=ib-platform-review";
  const questionBankHref = isIgcse ? "/igcse/question-bank" : "/question-bank/aa-hl?review=platform";
  const assignmentHref = reviewHref(curriculum, "student", "assignment");

  return <>
    <section className={`dashboard-hero student-dashboard-hero student-home-v2-hero ${isIgcse ? "student-dashboard-hero-igcse" : ""}`}>
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row">
          <div className="platform-access-summary"><span>Free account</span><small>Full question bank and classroom access</small><Link href={`${isIgcse ? "/igcse" : ""}/account/access`}>Explore course access</Link></div>
          <div className="platform-review-account"><span>MF</span><strong>Maya Flynn</strong><small>Student</small></div>
        </div>
        <div className="dashboard-hero-layout">
          <div className="dashboard-hero-copy"><span className="dashboard-role-label">My learning</span><h1>Welcome back, Maya</h1><p>Everything you need for {courseCode}, in one place.</p></div>
          <div className="student-home-course-chip"><span>Current course</span><strong>{courseCode}</strong><small>{courseName}</small></div>
        </div>
      </Container>
    </section>
    <section className={`student-dashboard student-home-v2 section-tight ${isIgcse ? "student-dashboard-igcse" : ""}`}>
      <Container className="stack-2xl">
        <section className="student-focus-grid" aria-labelledby="student-focus-heading">
          <article className="student-focus-primary">
            <div className="student-focus-top"><span className="student-focus-label">Your next task</span><span className="student-due-pill">Due tomorrow</span></div>
            <div className="student-focus-copy"><span>{className}</span><h2 id="student-focus-heading">Functions practice</h2><p>Three questions complete. Continue from question 4.</p></div>
            <div className="student-focus-footer"><div><span><strong>3 of 8</strong> questions</span><i><b style={{ width: "38%" }} /></i></div><Link className="button student-focus-button" href={assignmentHref}>Continue assignment <span aria-hidden="true">→</span></Link></div>
          </article>
          <article className="student-continue-card">
            <div className="student-continue-copy"><span className="student-focus-label">Continue learning</span><small>{continueTopic}</small><h2>{continueLesson}</h2><p>{continueDetail}</p><Link className="student-inline-action" href={courseReviewHref}>Open lesson <span aria-hidden="true">→</span></Link></div>
            {!isIgcse ? <Image src="/learn/assets/course-aa-hl.png" alt="" width={250} height={250} loading="eager" /> : <div className="student-continue-symbol" aria-hidden="true">x²</div>}
            <div className="student-continue-meter"><span><strong>1 of {freeLessonCount}</strong> free lessons complete</span><i><b style={{ width: `${freeLessonPercentage}%` }} /></i></div>
          </article>
        </section>

        <nav className="student-platform-nav student-platform-nav-v2" aria-label="Your learning areas">
          <Link className="is-course" href={courseReviewHref}><DashboardIcon name="book" /><span><strong>My course</strong><small>3 free lessons in every topic</small></span><b aria-hidden="true">→</b></Link>
          <Link className="is-question-bank" href={questionBankHref}><DashboardIcon name="progress" /><span><strong>Question bank</strong><small>All questions free</small></span><b aria-hidden="true">→</b></Link>
          <Link className="is-assignments" href="#assignments"><DashboardIcon name="assignment" /><span><strong>Assignments</strong><small>Two due soon</small></span><b aria-hidden="true">↓</b></Link>
          <Link className="is-progress" href="#progress"><DashboardIcon name="check" /><span><strong>My progress</strong><small>Course and questions</small></span><b aria-hidden="true">↓</b></Link>
        </nav>

        <section className="student-assignments student-home-section stack-lg" id="assignments">
          <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Assignments</p><h2>Due soon</h2></div><Link className="student-section-link" href={assignmentHref}>View all assignments →</Link></div>
          <div className="student-assignment-list">
            <Link className="student-assignment-card is-urgent" href={assignmentHref}><span className="student-assignment-status"><i style={{ width: "38%" }} /></span><div><small>{className}</small><strong>Functions practice</strong><span>Due tomorrow</span></div><div className="student-assignment-progress"><strong>3/8</strong><span>questions</span></div><span className="status-pill">Continue</span><span aria-hidden="true">→</span></Link>
            <Link className="student-assignment-card" href={assignmentHref}><span className="student-assignment-status"><i style={{ width: "0%" }} /></span><div><small>{className}</small><strong>Sequences review</strong><span>Due in 6 days</span></div><div className="student-assignment-progress"><strong>0/6</strong><span>questions</span></div><span className="status-pill">Start</span><span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="student-progress-overview student-home-section stack-lg" id="progress" aria-labelledby="student-progress-heading">
          <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Personal progress</p><h2 id="student-progress-heading">Your progress</h2></div><p className="muted">Course lessons and question-bank practice are kept separate, so each number is meaningful.</p></div>
          <div className="student-progress-grid student-progress-grid-v2">
            <article className="student-progress-summary is-course-progress">
              <div><p className="student-dashboard-kicker">Free course preview</p><strong className="student-progress-number">1 of {freeLessonCount}</strong><span>{courseName}</span></div>
              <div className="student-progress-ring" style={{ "--student-progress": freeLessonProgress } as CSSProperties}><span>{freeLessonPercentage}%</span></div>
              <dl><div><dt>Lessons watched</dt><dd>1</dd></div><div><dt>Practice sets</dt><dd>1</dd></div><div><dt>Free lessons left</dt><dd>{freeLessonCount - 1}</dd></div></dl>
              <Link className="student-inline-action" href={courseReviewHref}>Continue course →</Link>
            </article>
            <article className="student-progress-summary is-bank-progress">
              <div><p className="student-dashboard-kicker">Question bank progress</p><strong className="student-progress-number">126</strong><span>questions completed</span></div>
              <div className="student-progress-ring" style={{ "--student-progress": "19deg" } as CSSProperties}><span>5%</span></div>
              <dl><div><dt>Topics practised</dt><dd>5</dd></div><div><dt>Saved whiteboards</dt><dd>18</dd></div><div><dt>Bank explored</dt><dd>5%</dd></div></dl>
              <Link className="student-inline-action" href={questionBankHref}>Continue practising →</Link>
            </article>
          </div>
        </section>

        <section className="student-resource-row" aria-label="More ways to learn">
          {!isIgcse ? <Link className="student-resource-card is-papers" href={`${courseReviewHref}&course=aa-hl&view=past-papers`}><span className="student-resource-icon" aria-hidden="true">P</span><span><small>Exam preparation</small><strong>Past-paper solutions</strong><em>Specimen and May 2021 are free</em></span><b aria-hidden="true">→</b></Link> : <Link className="student-resource-card is-papers" href={questionBankHref}><span className="student-resource-icon" aria-hidden="true">Q</span><span><small>Independent practice</small><strong>Question bank</strong><em>Filter by topic and difficulty</em></span><b aria-hidden="true">→</b></Link>}
          <Link className="student-resource-card is-saved" href={questionBankHref}><span className="student-resource-icon" aria-hidden="true">18</span><span><small>Your work</small><strong>Saved whiteboards</strong><em>Continue from any device</em></span><b aria-hidden="true">→</b></Link>
        </section>

        <section className="student-class-section student-home-section stack-lg">
          <div className="dashboard-section-heading student-section-heading"><div><p className="eyebrow">Classes</p><h2>Your classes</h2></div><p className="muted">Classes keep your teacher&apos;s assignments and feedback together.</p></div>
          <div className="student-class-grid"><article className="student-class-card"><div className="student-class-card-top"><DashboardIcon name="class" /><span className="badge">{courseCode}</span></div><div><small>Class</small><h3>{className}</h3></div><div className="student-class-card-meta"><span><strong>6</strong> assignments</span><span>Joined 9 Oct</span></div></article></div>
          <details className="join-class-panel"><summary>Join another class<span aria-hidden="true">+</span></summary><div className="join-class-form"><label className="field"><span>Class code</span><input aria-label="Example class code" placeholder="ABC1234" readOnly /></label><button className="button button-small" type="button">Join class</button></div></details>
        </section>

        <section className="platform-review-upgrade student-upgrade-v2"><div><span className="platform-review-card-label">Free account</span><h2>Ready for Mr Flynn IB Plus?</h2><p>Your complete question bank, classes and assignments stay free. Plus unlocks every video lesson and the complete set of extra practice questions inside the lessons.</p></div><Link className="button button-secondary" href={`${isIgcse ? "/igcse" : ""}/account/access`}>See Plus access</Link></section>
      </Container>
    </section>
  </>;
}

function StudentAssignment({ curriculum }: { curriculum: "ib" | "igcse" }) {
  const isIgcse = curriculum === "igcse";
  const className = isIgcse ? "Year 11 IGCSE" : "Year 12 AA HL";
  return <div className={`teacher-workspace student-assignment-workspace ${isIgcse ? "student-assignment-workspace-igcse" : ""}`}>
    <section className="teacher-workspace-hero"><Container className="stack"><Link className="dashboard-back-link" href={reviewHref(curriculum, "student")}>← Learning home</Link><div className="teacher-workspace-title"><div><p className="dashboard-role-label">{className}</p><h1>Functions practice</h1><p>Complete each question and show your working on the whiteboard or paper.</p></div><div className="teacher-workspace-stats"><span><strong>3/8</strong>complete</span><span><strong>Tomorrow</strong>due</span></div></div></Container></section>
    <section className="section-tight"><Container className="stack-xl">
      <div className="platform-review-question-nav" aria-label="Assignment questions">{[1,2,3,4,5,6,7,8].map((number) => <span className={number < 4 ? "is-complete" : number === 4 ? "is-current" : ""} key={number}>Q{number}</span>)}</div>
      <article className="platform-review-question-card"><div className="platform-review-question-heading"><span>Question 4</span><strong>Quadratic functions</strong><small>[4 marks]</small></div><p>Find the coordinates of the vertex of the graph of <i>y</i> = <i>x</i><sup>2</sup> − 6<i>x</i> + 11.</p><div className="platform-review-answer"><span>Your answer</span><input aria-label="Example answer" value="(3, 2)" readOnly /><button className="button button-small" type="button">Check answer</button></div><div className="platform-review-whiteboard"><span>Saved whiteboard</span><p>Your working saves automatically. Open the whiteboard below or place it beside the question on desktop.</p><button className="button button-secondary button-small" type="button">Open whiteboard</button></div></article>
      <div className="platform-review-assignment-actions"><button className="button button-secondary" type="button">← Previous</button><span>Saved</span><button className="button" type="button">Next question →</button></div>
    </Container></section>
  </div>;
}

function TeacherHome({ curriculum }: { curriculum: "ib" | "igcse" }) {
  const isIgcse = curriculum === "igcse";
  const course = isIgcse ? "IGCSE" : "AA HL";
  const className = isIgcse ? "Year 11 IGCSE" : "Year 12 AA HL";
  return <>
    <section className={`dashboard-hero teacher-dashboard-hero ${isIgcse ? "teacher-dashboard-hero-igcse" : ""}`}><Container className="dashboard-hero-shell"><div className="dashboard-account-row"><div className="platform-access-summary teacher-early-access"><span>Free teacher account</span><small>Classes, assignments and Test Maker included</small><Link href={isIgcse ? "/igcse/schools" : "/schools"}>School access</Link></div><div className="platform-review-account"><span>RF</span><strong>Mr Flynn</strong><small>Teacher</small></div></div><div className="dashboard-hero-layout"><div className="dashboard-hero-copy"><span className="dashboard-role-label">{isIgcse ? "IGCSE" : "IB"} teacher dashboard</span><h1>Welcome, Mr Flynn</h1><p>Create and manage your own classes. Students join with the code you share.</p></div><div className="dashboard-hero-stats"><div><strong>2</strong><span>classes</span></div><div><strong>38</strong><span>students</span></div><div><strong>9</strong><span>assignments</span></div></div></div></Container></section>
    <section className={`section-tight teacher-dashboard ${isIgcse ? "igcse-teacher-dashboard" : ""}`}><Container className="stack-xl">
      <section className="teacher-tool-banner"><div className="teacher-tool-banner-icon" aria-hidden="true">T</div><div><p className="eyebrow">Teacher tools</p><h2>{isIgcse ? "IGCSE" : "IB"} Test Maker</h2><p>Select questions, then save, reuse and print a formatted paper, mark scheme and question-level analysis.</p></div><Link className="button" href={isIgcse ? "/igcse/teacher/test-maker" : "/teacher/test-maker"}>Open Test Maker</Link></section>
      <div className="teacher-layout"><div className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Classes and assignments</p><h2>Your classes</h2></div><p className="muted">Open a class to set work, share its joining code and review student progress.</p></div><div className="teacher-class-grid"><Link className="teacher-class-card" href={reviewHref(curriculum, "teacher", "class")}><div className="teacher-class-card-top"><DashboardIcon name="class" /><span className="badge">{course}</span></div><h3>{className}</h3><div className="teacher-card-stats"><span><strong>22</strong> students</span><span><strong>6</strong> assignments</span></div><small className="teacher-class-code">Class code <strong>A7K9P2</strong></small><span className="text-link">Open class</span></Link><Link className="teacher-class-card" href={reviewHref(curriculum, "teacher", "class")}><div className="teacher-class-card-top"><DashboardIcon name="class" /><span className="badge">{course}</span></div><h3>Revision group</h3><div className="teacher-card-stats"><span><strong>16</strong> students</span><span><strong>3</strong> assignments</span></div><small className="teacher-class-code">Class code <strong>M4T8Q1</strong></small><span className="text-link">Open class</span></Link></div></div><aside className="account-card teacher-create-panel stack"><DashboardIcon name="add" /><div><p className="eyebrow">New class</p><h3>Create a class</h3><p className="muted small">Each teacher creates and manages their own classes.</p></div><label className="field"><span>Class name</span><input value={className} readOnly /></label><label className="field"><span>Course</span><select value={course} disabled><option>{course}</option></select></label><button className="button" type="button">Create class</button></aside></div>
    </Container></section>
  </>;
}

function TeacherClass({ curriculum }: { curriculum: "ib" | "igcse" }) {
  const isIgcse = curriculum === "igcse";
  const course = isIgcse ? "IGCSE" : "AA HL";
  const className = isIgcse ? "Year 11 IGCSE" : "Year 12 AA HL";
  return <div className={`teacher-workspace ${isIgcse ? "teacher-workspace-igcse" : ""}`}><section className="teacher-workspace-hero"><Container className="stack"><Link className="dashboard-back-link" href={reviewHref(curriculum, "teacher")}>← Teacher dashboard</Link><div className="teacher-workspace-title"><div><p className="dashboard-role-label">{course} class</p><h1>{className}</h1><p>Manage students, set assignments and review performance over time.</p></div><div className="teacher-workspace-stats"><span><strong>22</strong>students</span><span><strong>6</strong>assignments</span></div></div></Container></section><section className="section-tight"><Container className="stack-xl"><div className="class-toolbar"><div className="class-code"><span>Class code</span><strong>A7K9P2</strong><small>Share this with students</small></div><div className="class-toolbar-actions"><Link className="button" href={reviewHref(curriculum, "teacher", "set-assignment")}>Set assignment</Link></div></div><section className="dashboard-panel stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Assignment history</p><h2>Class performance</h2></div><p className="muted">Student names stay fixed while assignment columns continue across the page.</p></div><div className="platform-review-results"><table><thead><tr><th>Student</th><th>Functions</th><th>Sequences</th><th>Statistics</th><th>Overall</th></tr></thead><tbody><tr><th>Aisha Rahman</th><td className="is-strong">88%</td><td className="is-strong">79%</td><td>68%</td><td>78%</td></tr><tr><th>Daniel Kim</th><td>63%</td><td className="is-strong">82%</td><td className="is-low">41%</td><td>62%</td></tr><tr><th>Sofia Martins</th><td className="is-strong">91%</td><td>70%</td><td className="is-strong">76%</td><td>79%</td></tr></tbody></table></div></section></Container></section></div>;
}

function SetAssignment({ curriculum }: { curriculum: "ib" | "igcse" }) {
  const isIgcse = curriculum === "igcse";
  const className = isIgcse ? "Year 11 IGCSE" : "Year 12 AA HL";
  return <div className={`teacher-workspace ${isIgcse ? "teacher-workspace-igcse" : ""}`}><section className="teacher-workspace-hero"><Container className="stack"><Link className="dashboard-back-link" href={reviewHref(curriculum, "teacher", "class")}>← {className}</Link><div className="teacher-workspace-title"><div><p className="dashboard-role-label">New assignment</p><h1>Choose questions</h1><p>Filter the real question bank, select a whole subtopic at once, then choose the class or individual students.</p></div><div className="teacher-workspace-stats"><span><strong>5</strong>selected</span><span><strong>22</strong>students</span></div></div></Container></section><section className="section-tight"><Container className="stack-xl"><div className="platform-review-builder"><aside className="platform-review-builder-filters"><p className="eyebrow">Filters</p><label className="field"><span>Topic</span><select value="Number and algebra" disabled><option>Number and algebra</option></select></label><label className="field"><span>Subtopic</span><select value="Arithmetic sequences" disabled><option>Arithmetic sequences</option></select></label><button className="button button-secondary button-small" type="button">Select all 12 questions</button></aside><section className="platform-review-builder-results"><div className="dashboard-section-heading"><div><p className="eyebrow">Question bank</p><h2>Arithmetic sequences</h2></div><p className="muted">Answers stay collapsed while questions are selected.</p></div>{["Find the common difference of an arithmetic sequence.","Find the sum of the first 20 terms.","Determine the value of n for the given series."].map((question,index)=><article className="platform-review-picker-question" key={question}><input type="checkbox" checked={index < 2} readOnly aria-label={`Select question ${index + 1}`} /><span><strong>Question {index + 1}</strong><small>{index + 2} marks · {index === 0 ? "Easy" : "Medium"}</small><p>{question}</p></span></article>)}</section></div><section className="dashboard-panel stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Assignment details</p><h2>Publish to your students</h2></div><p className="muted">Choose the whole class or specific students.</p></div><div className="platform-review-publish-grid"><label className="field"><span>Assignment title</span><input value="Sequences review" readOnly /></label><label className="field"><span>Due date</span><input value="30/10/2026" readOnly /></label><fieldset><legend>Who should receive this?</legend><label><input type="radio" checked readOnly /> Whole class</label><label><input type="radio" readOnly /> Selected students</label></fieldset><button className="button" type="button">Publish assignment</button></div></section></Container></section></div>;
}

export default async function PlatformReviewPage({ searchParams }: { searchParams: Promise<ReviewSearchParams> }) {
  const params = await searchParams;
  const curriculum: "ib" | "igcse" = value(params.curriculum) === "igcse" ? "igcse" : "ib";
  const role: "student" | "teacher" = value(params.role) === "teacher" ? "teacher" : "student";
  const screen = value(params.screen) || "home";

  let content: React.ReactNode;
  if (role === "student") content = screen === "assignment" ? <StudentAssignment curriculum={curriculum} /> : <StudentHome curriculum={curriculum} />;
  else if (screen === "class") content = <TeacherClass curriculum={curriculum} />;
  else if (screen === "set-assignment") content = <SetAssignment curriculum={curriculum} />;
  else content = <TeacherHome curriculum={curriculum} />;

  return <><ReviewBar curriculum={curriculum} role={role} />{content}</>;
}
