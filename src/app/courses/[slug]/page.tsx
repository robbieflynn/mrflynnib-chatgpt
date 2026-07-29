import type { Metadata } from "next";
import katex from "katex";
import { notFound } from "next/navigation";
import curriculumData from "@/data/curricula.json";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { courseAccessPlans, courses } from "@/lib/content";

type CurriculumTopic = { name: string; lessons: string[] };
const curricula = curriculumData as Record<string, CurriculumTopic[]>;

const mathematicalLessonTitles: Record<string, { before: string; expression: string; after?: string }> = {
  "Graphs of y = (f(x))^2": { before: "Graphs of ", expression: "y = [f(x)]^2" },
  "Finding f(x)": { before: "Finding ", expression: "f(x)" },
  "Integrating e^x and 1/x": { before: "Integrating ", expression: "e^x \\text{ and } \\frac{1}{x}" },
  "Differentiating trig, e^x and lnx": { before: "Differentiating trigonometric functions, ", expression: "e^x \\text{ and } \\ln x" },
  "Differentiating x^n where n is rational": { before: "Differentiating ", expression: "x^n", after: " where n is rational" },
  "Integration of x^n where n is rational": { before: "Integration of ", expression: "x^n", after: " where n is rational" },
  "Integrating e^x": { before: "Integrating ", expression: "e^x" },
};

function CurriculumLesson({ lesson }: { lesson: string }) {
  const match = lesson.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  const number = match?.[1] ?? "";
  const title = match?.[2] ?? lesson;
  const mathematicalTitle = mathematicalLessonTitles[title];

  return (
    <li>
      {number && <span className="curriculum-lesson-number">{number}</span>}
      <span className="curriculum-lesson-title">
        {mathematicalTitle ? <>{mathematicalTitle.before}<span className="curriculum-inline-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(mathematicalTitle.expression, { throwOnError: false, output: "html" }) }} />{mathematicalTitle.after}</> : title}
      </span>
    </li>
  );
}

export function generateStaticParams() { return courses.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  return course ? { title: course.title, description: `${course.description} Choose from three access options.` } : {};
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();

  const curriculum = curricula[course.shortTitle] ?? [];

  return (
    <>
      <section className="course-detail-hero">
        <Container className="course-detail-grid">
          <div className="stack-lg">
            <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.shortTitle }]} />
            <div className="course-detail-code">{course.shortTitle}</div>
            <Eyebrow>{course.pathway} · {course.level}</Eyebrow>
            <h1>{course.promise}</h1>
            <p className="lede">{course.description}</p>
          </div>
          <aside className="course-purchase-card">
            <div className="stack"><Eyebrow>Choose your access</Eyebrow><h2>One complete course. Three access options.</h2><p>Every plan includes the complete {course.shortTitle} course. Choose and purchase your access on Teachable.</p></div>
            <ul className="access-plan-list">
              {courseAccessPlans.map((plan) => <li className={plan.recommended ? "access-plan-recommended" : ""} key={plan.duration}><div><strong>{plan.duration}</strong>{plan.recommended && <span>Recommended</span>}<small>{plan.description}</small></div><b>${plan.price}</b></li>)}
            </ul>
            <ButtonLink href={course.teachableUrl} external>View access plans and enroll</ButtonLink>
            <small>Prices are in US dollars. Payment and secure course access continue on Teachable.</small>
          </aside>
        </Container>
      </section>

      <section className="section course-outcomes-section">
        <Container className="split">
          <div className="stack"><Eyebrow>What you’ll learn</Eyebrow><h2>Understand the method and know when to use it.</h2><p className="lede">The goal is not simply to watch more videos. It is to make unfamiliar IB questions feel more manageable because the underlying mathematics is clear.</p></div>
          <ul className="outcome-list">{course.outcomes.map((outcome, index) => <li key={outcome}><span>0{index + 1}</span><strong>{outcome}</strong></li>)}</ul>
        </Container>
      </section>

      <section id="curriculum" className="section curriculum-section">
        <Container className="stack-xl">
          <div className="section-heading-row"><div className="stack"><Eyebrow>Full curriculum</Eyebrow><h2>See exactly what is covered.</h2></div><p className="lede">The curriculum is structured directly from the complete course syllabus. Open any topic to see its lesson sequence.</p></div>
          <div className="curriculum-list">
            {curriculum.map((topic, index) => (
              <details className="curriculum-topic" key={topic.name} open={index === 0}>
                <summary><span>0{index + 1}</span><strong>{topic.name}</strong><small>{topic.lessons.length} lessons</small><i aria-hidden="true">+</i></summary>
                <ol>{topic.lessons.map((lesson) => <CurriculumLesson lesson={lesson} key={lesson} />)}</ol>
              </details>
            ))}
          </div>
          <div className="course-curriculum-extras">
            <div className="stack"><Eyebrow>Also included</Eyebrow><h2>Support beyond the topic lessons.</h2></div>
            <div className="course-extra-grid">
              <article><span>IA</span><div><h3>Internal Assessment guidance</h3><p>Clear guidance for understanding the IA process, developing an idea and improving the finished exploration.</p></div></article>
              <article><span>PP</span><div><h3>Past-paper solutions</h3><p>Worked solutions that show how to approach IB Mathematics questions and communicate the method clearly.</p></div></article>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
