import "../compact-header.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionBankEmbed } from "@/components/question-bank-embed";
import { Breadcrumbs, Container } from "@/components/ui";
import { getQuestionBankCourse, questionBankCourses } from "@/lib/question-bank-courses";
import { getQuestionBankDashboardLink } from "@/lib/question-bank-dashboard-link";

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

export default async function CourseQuestionBankPage({ params, searchParams }: { params: Promise<{ course: string }>; searchParams: Promise<{ topic?: string | string[]; subtopic?: string | string[]; review?: string | string[] }> }) {
  const { course: slug } = await params;
  const filters = await searchParams;
  const course = getQuestionBankCourse(slug);
  if (!course || !course.available) notFound();
  const topic = typeof filters.topic === "string" ? filters.topic : undefined;
  const subtopic = typeof filters.subtopic === "string" ? filters.subtopic : undefined;
  const accountDashboardLink = await getQuestionBankDashboardLink({ curriculum: "ib", course: course.slug });
  const dashboardLink = filters.review === "platform"
    ? { label: "My learning", href: "/platform-review?curriculum=ib&role=student", signedIn: true }
    : accountDashboardLink;
  const learningHomeLabel = dashboardLink.label === "Student dashboard" ? "My learning" : dashboardLink.label;

  return (
    <>
      <section className="qb-course-page-hero qb-course-page-hero-compact">
        <Container className="qb-course-header-inner">
          <Breadcrumbs items={[{ ...dashboardLink, label: learningHomeLabel }, { label: "Question bank", href: "/question-bank" }, { label: course.code }]} />
          <div className="qb-course-page-heading">
            <div className="qb-course-title-block">
              <h1>{course.code.split(" ")[0]} <span>{course.code.split(" ")[1]}</span></h1>
              <p className="qb-course-count">{course.questionCount?.toLocaleString("en-GB")} questions</p>
            </div>
            <div className="qb-course-page-actions">
              <nav className="qb-course-switcher" aria-label="Change question bank course">
                <div>
                  {questionBankCourses.map((item) => (
                    item.available
                      ? <Link aria-current={item.slug === course.slug ? "page" : undefined} href={`/question-bank/${item.slug}`} key={item.slug}>{item.code}</Link>
                      : <span className="is-coming-soon" key={item.slug}>{item.code}<small>Soon</small></span>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </Container>
      </section>

      <section className="qb-course-content">
        <QuestionBankEmbed deferUntilLoaded course={course.code} topic={topic} subtopic={subtopic} />
      </section>
    </>
  );
}
