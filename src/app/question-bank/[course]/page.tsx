import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";
import { getQuestionBankCourse, questionBankCourses } from "@/lib/question-bank-courses";

export function generateStaticParams() {
  return questionBankCourses.filter((course) => course.available).map((course) => ({ course: course.slug }));
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
  if (!course || !course.available) notFound();

  return (
    <>
      <section className="qb-course-page-hero">
        <Container className="stack-lg">
          <Breadcrumbs items={[{ label: "Question bank", href: "/question-bank" }, { label: course.code }]} />
          <div className="qb-course-page-heading">
            <div className="stack">
              <Eyebrow>{course.code} question bank</Eyebrow>
              <h1>{course.pathway} {course.level}</h1>
              <p className="lede">
                {course.questionCount?.toLocaleString("en-GB")} questions, organised by topic, paper and difficulty, with complete mark schemes.
              </p>
            </div>
            <nav className="qb-course-switcher" aria-label="Change question bank course">
              <span>Change course</span>
              <div>
                {questionBankCourses.map((item) => (
                  item.available
                    ? <Link aria-current={item.slug === course.slug ? "page" : undefined} href={`/question-bank/${item.slug}`} key={item.slug}>{item.code}</Link>
                    : <span className="is-coming-soon" key={item.slug}>{item.code}<small>Soon</small></span>
                ))}
              </div>
            </nav>
          </div>
        </Container>
      </section>

      <section className="qb-course-content">
        <QuestionBankEmbed course={course.code} />
      </section>
    </>
  );
}
