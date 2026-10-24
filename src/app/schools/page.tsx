import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "IB Mathematics for schools",
  description: "Free classroom tools, assignments, test making and optional IB Mathematics course access for schools and departments.",
};

const teacherTools = [
  { number: "01", title: "Classes and assignments", body: "Create a class, invite students with a code and set work from the question bank.", className: "school-tool-classes" },
  { number: "02", title: "Question bank and whiteboards", body: "Students answer questions and can show their working on the built-in whiteboard.", className: "school-tool-bank" },
  { number: "03", title: "IB Test Maker", body: "Build printable assessments and mark schemes from selected questions in a few steps.", className: "school-tool-tests" },
  { number: "04", title: "Progress and analysis", body: "Review assignment history, student performance and question-level results in one place.", className: "school-tool-progress" },
] as const;

export default function SchoolsPage() {
  return (
    <>
      <section className="schools-hero schools-hero-v2">
        <Container className="schools-hero-shell">
          <Breadcrumbs items={[{ label: "Schools" }]} />
          <div className="schools-hero-layout">
            <div className="schools-hero-heading stack-lg">
              <Eyebrow>For IB Mathematics departments</Eyebrow>
              <h1>Better tools for teachers. Clearer support for students.</h1>
              <p className="lede">Create classes, set work, review performance and build assessments. Add complete course access when your students need it.</p>
              <div className="cluster">
                <ButtonLink href="/account?next=/teacher&mode=sign-up">Create a free teacher account</ButtonLink>
                <ButtonLink href="#school-enquiry" secondary>Ask about school access</ButtonLink>
              </div>
            </div>
            <div className="school-workspace-preview" aria-label="Mr Flynn IB school tools">
              <div className="school-preview-heading"><span>Teacher workspace</span><strong>Year 12 AA HL</strong></div>
              <div className="school-preview-stat school-preview-stat-wide"><small>Assignment overview</small><strong>24 students</strong><span>Class progress and question-level results</span></div>
              <div className="school-preview-stat"><small>Question bank</small><strong>2,380</strong><span>AA HL questions</span></div>
              <div className="school-preview-stat"><small>Test Maker</small><strong>Ready</strong><span>Paper, mark scheme and analysis</span></div>
              <div className="school-preview-footer"><span>Classes</span><span>Assignments</span><span>Tests</span></div>
            </div>
          </div>
        </Container>
      </section>

      <section className="school-benefit-strip">
        <Container className="grid-3">
          <article><strong>Teacher tools are free</strong><span>Start using classes, assignments and Test Maker without a school purchase.</span></article>
          <article><strong>Simple student joining</strong><span>Students use a class code and work from their existing account.</span></article>
          <article><strong>Course access is optional</strong><span>Add complete video-course licences only for the students who need them.</span></article>
        </Container>
      </section>

      <section className="section school-tools-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Teacher workspace</Eyebrow><h2>Set work, see progress and build assessments.</h2></div>
            <p className="lede">The day-to-day classroom tools are designed to be useful immediately, without requiring a paid school package.</p>
          </div>
          <div className="school-tool-grid">
            {teacherTools.map((tool) => (
              <article className={`school-tool-card ${tool.className}`} key={tool.title}>
                <span>{tool.number}</span>
                <div className="stack"><h3>{tool.title}</h3><p>{tool.body}</p></div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section school-access-section" id="school-options">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Choose the right starting point</Eyebrow><h2>Use the teaching tools free. Add courses when needed.</h2></div>
            <p className="lede">A school does not need to purchase course licences before its teachers can create classes or set assignments.</p>
          </div>
          <div className="school-access-grid">
            <article className="school-access-card school-access-free">
              <small>For every teacher</small>
              <h3>Free classroom tools</h3>
              <p>Create classes, set question-bank assignments, review student work and prepare printable assessments.</p>
              <ul className="check-list"><li>Teacher accounts and class codes</li><li>Assignments and student whiteboards</li><li>IB Test Maker and mark schemes</li><li>Class and question-level analysis</li></ul>
              <ButtonLink href="/account?next=/teacher&mode=sign-up">Create a teacher account</ButtonLink>
            </article>
            <article className="school-access-card school-access-paid">
              <small>For school cohorts</small>
              <h3>Complete course access</h3>
              <p>Add structured video lessons and in-lesson practice for selected students across AA HL, AA SL, AI HL or AI SL.</p>
              <ul className="check-list"><li>Complete course for each selected pathway</li><li>Video lessons and lesson practice</li><li>Access arranged for your student cohort</li><li>School quotation and invoicing</li></ul>
              <ButtonLink href="#school-enquiry" secondary>Ask about course licences</ButtonLink>
            </article>
          </div>
        </Container>
      </section>

      <section className="section school-flow-section">
        <Container className="stack-xl">
          <div className="stack school-flow-heading"><Eyebrow>How it works</Eyebrow><h2>A straightforward classroom setup.</h2></div>
          <div className="school-flow-grid">
            <article><span>1</span><div><strong>Create a class</strong><p>A teacher opens a free account and creates a separate class for each group.</p></div></article>
            <article><span>2</span><div><strong>Students join</strong><p>Students enter the class code and see assignments in their Learning home.</p></div></article>
            <article><span>3</span><div><strong>Add course access if needed</strong><p>Contact us when a cohort would benefit from the complete video course.</p></div></article>
          </div>
        </Container>
      </section>

      <section id="school-enquiry" className="section school-enquiry-section">
        <Container className="split">
          <div className="stack-lg"><Eyebrow>School enquiries</Eyebrow><h2>Tell us what your department needs.</h2><p className="lede">Share your courses, likely student numbers and how you hope to use Mr Flynn IB. We will recommend a practical setup and confirm any course-access quotation before you commit.</p></div>
          <EnquiryForm kind="school" />
        </Container>
      </section>
    </>
  );
}
