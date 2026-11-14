import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container } from "@/components/ui";
import { questionBankCourses } from "@/lib/question-bank-courses";

export const metadata: Metadata = {
  title: "IB Mathematics question bank",
  description: "Choose your IB Mathematics course and practise with the Mr Flynn IB question bank.",
};

export default function QuestionBankPage() {
  return (
    <section className="qb-index-hero">
      <Container className="qb-index-shell">
        <Breadcrumbs items={[{ label: "Question bank" }]} />

        <div className="qb-index-intro">
          <h1>Choose your <span>question bank</span></h1>
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
