import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";
import { questionBankCourses } from "@/lib/question-bank-courses";
import { getQuestionBankDashboardLink } from "@/lib/question-bank-dashboard-link";

export const metadata: Metadata = {
  title: "Free IB Mathematics question bank",
  description: "Choose your IB Mathematics course and practise with the Mr Flynn IB question bank.",
};

export default async function QuestionBankPage() {
  const dashboardLink = await getQuestionBankDashboardLink({ curriculum: "ib" });
  const dashboardLabel = dashboardLink.label === "Student dashboard" ? "My learning" : dashboardLink.label;
  return (
    <section className="qb-index-hero">
      <Container className="qb-index-shell">
        <Breadcrumbs items={[{ label: "Question bank" }]} />

        <div className="qb-index-intro">
          <Eyebrow>Question bank</Eyebrow>
          <h1>Choose your question bank.</h1>
          <p className="lede">Select your IB Mathematics course to see the questions that belong to your syllabus.</p>
          <div className="qb-account-route">
            <span>{dashboardLink.signedIn ? "Your completed questions and whiteboard working are saved to this account." : "Sign in to save completed questions and whiteboard working."}</span>
            {dashboardLink.signedIn
              ? <Link className="button button-small" href={dashboardLink.href}>{dashboardLabel}</Link>
              : <div className="qb-account-actions">
                <Link className="button button-small" href="/account">Student sign in</Link>
                <Link className="button button-secondary button-small" href="/account?next=/teacher">Teacher sign in</Link>
              </div>}
          </div>
        </div>

        <div className="qb-course-link-grid" aria-label="Choose your IB Mathematics course">
          {questionBankCourses.map((course) => {
            const content = <>
              <span className="qb-course-link-code">{course.code}</span>
              <span className="qb-course-link-name">
                <strong>{course.pathway}</strong>
                <small>{course.level}</small>
                {course.questionCount && <small>{course.questionCount.toLocaleString("en-GB")} questions</small>}
              </span>
              {course.available
                ? <span className="qb-course-link-arrow" aria-hidden="true">→</span>
                : <span className="qb-coming-soon">Coming soon</span>}
            </>;

            return course.available
              ? <Link className="qb-course-link" href={`/question-bank/${course.slug}`} key={course.slug}>{content}</Link>
              : <div aria-disabled="true" className="qb-course-link is-coming-soon" key={course.slug}>{content}</div>;
          })}
        </div>

      </Container>
    </section>
  );
}
