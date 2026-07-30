import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { getQuestionBankCourse, questionBankCourses } from "@/lib/question-bank-courses";

export function generateStaticParams() {
  return questionBankCourses.map((course) => ({ course: course.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }): Promise<Metadata> {
  const { course: slug } = await params;
  const course = getQuestionBankCourse(slug);
  if (!course) return {};

  return {
    title: `${course.code} question bank`,
    description: `Practise ${course.pathway} ${course.level} questions by topic, paper and difficulty.`,
  };
}

export default async function CourseQuestionBankPage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const course = getQuestionBankCourse(slug);
  if (!course) notFound();

  return (
    <>
      <section className="qb-course-page-hero">
        <Container className="stack-lg">
          <Breadcrumbs items={[{ label: "Question bank", href: "/question-bank" }, { label: course.code }]} />
          <div className="qb-course-page-heading">
            <div className="stack">
              <Eyebrow>{course.code} question bank</Eyebrow>
              <h1>{course.pathway} {course.level}.</h1>
              <p className="lede">Practise the questions that belong to your course, organised clearly by topic, paper and difficulty.</p>
            </div>
            <nav className="qb-course-switcher" aria-label="Change question bank course">
              <span>Change course</span>
              <div>
                {questionBankCourses.map((item) => (
                  <Link aria-current={item.slug === course.slug ? "page" : undefined} href={`/question-bank/${item.slug}`} key={item.slug}>
                    {item.code}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </Container>
      </section>

      <section className="qb-course-content">
        <Container>
          <div className="qb-course-empty">
            <span>Question bank in preparation</span>
            <h2>The {course.code} collection is being organised.</h2>
            <p>The current verified collection belongs to the older HL syllabus. It is being kept separate so that you only see questions that genuinely belong to {course.code}.</p>
            <div className="cluster">
              <ButtonLink href="/question-bank/legacy-hl">Use the Legacy HL archive</ButtonLink>
              <ButtonLink href="/question-bank" secondary>Choose another course</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
