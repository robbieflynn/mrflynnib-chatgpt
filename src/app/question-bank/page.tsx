import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";
import { questionBankCourses } from "@/lib/question-bank-courses";

export const metadata: Metadata = {
  title: "Free IB Mathematics question bank",
  description: "Choose your IB Mathematics course and practise with the Mr Flynn IB question bank.",
};

export default function QuestionBankPage() {
  return (
    <section className="qb-index-hero">
      <Container className="qb-index-shell">
        <Breadcrumbs items={[{ label: "Question bank" }]} />

        <div className="qb-index-intro">
          <div className="cluster">
            <span className="free-pill">Free early access</span>
            <Eyebrow>Question bank</Eyebrow>
          </div>
          <h1>Choose your question bank.</h1>
          <p className="lede">Select your IB Mathematics course to see the questions that belong to your syllabus.</p>
        </div>

        <div className="qb-course-link-grid" aria-label="Choose your IB Mathematics course">
          {questionBankCourses.map((course) => (
            <Link className="qb-course-link" href={`/question-bank/${course.slug}`} key={course.slug}>
              <span className="qb-course-link-code">{course.code}</span>
              <span className="qb-course-link-name">
                <strong>{course.pathway}</strong>
                <small>{course.level}</small>
              </span>
              <span className="qb-course-link-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        <div className="qb-index-legacy">
          <span>Studying an older syllabus?</span>
          <Link href="/question-bank/legacy-hl">
            Open the Legacy HL archive <strong>53 questions</strong>
          </Link>
        </div>
      </Container>
    </section>
  );
}
