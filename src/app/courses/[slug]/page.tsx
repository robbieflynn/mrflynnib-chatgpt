import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import curriculumData from "@/data/curricula.json";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { courseAccessPlans, courses } from "@/lib/content";

type CurriculumTopic = { name: string; lessons: string[] };
const curricula = curriculumData as Record<string, CurriculumTopic[]>;

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
  const lessonCount = curriculum.reduce((total, topic) => total + topic.lessons.length, 0);

  return (
    <>
      <section className="course-detail-hero">
        <Container className="course-detail-grid">
          <div className="stack-lg">
            <div className="course-detail-code">{course.shortTitle}</div>
            <Eyebrow>{course.pathway} · {course.level}</Eyebrow>
            <h1>{course.promise}</h1>
            <p className="lede">{course.description}</p>
            <div className="course-detail-proof"><span><strong>{lessonCount}</strong> syllabus lessons</span><span><strong>5</strong> topic areas</span><span><strong>3</strong> access options</span></div>
          </div>
          <aside className="course-purchase-card">
            <div className="stack"><Eyebrow>Choose your access</Eyebrow><h2>One complete course. Three access options.</h2><p>Every plan includes the complete {course.shortTitle} course. Choose and purchase your access on Teachable.</p></div>
            <ul className="access-plan-list">
              {courseAccessPlans.map((plan) => <li className={plan.recommended ? "access-plan-recommended" : ""} key={plan.duration}><div><strong>{plan.duration}</strong>{plan.recommended && <span>Recommended</span>}<small>{plan.description}</small></div><b>${plan.price}</b></li>)}
            </ul>
            <ButtonLink href={course.teachableUrl} external>View access plans and enrol</ButtonLink>
            <small>Prices are in US dollars. Payment and secure course access continue on Teachable.</small>
          </aside>
        </Container>
      </section>

      <section className="section course-outcomes-section">
        <Container className="split">
          <div className="stack"><Eyebrow>What this course builds</Eyebrow><h2>Understand the method—and know when to use it.</h2><p className="lede">The goal is not simply to watch more videos. It is to make unfamiliar IB questions feel more manageable because the underlying mathematics is clear.</p></div>
          <ul className="outcome-list">{course.outcomes.map((outcome, index) => <li key={outcome}><span>0{index + 1}</span><strong>{outcome}</strong></li>)}</ul>
        </Container>
      </section>

      <section id="curriculum" className="section curriculum-section">
        <Container className="stack-xl">
          <div className="section-heading-row"><div className="stack"><Eyebrow>Full curriculum</Eyebrow><h2>See exactly what is covered.</h2></div><p className="lede">The curriculum below comes from Rob&apos;s course syllabus. Open any topic to see its complete lesson structure.</p></div>
          <div className="curriculum-list">
            {curriculum.map((topic, index) => (
              <details className="curriculum-topic" key={topic.name} open={index === 0}>
                <summary><span>0{index + 1}</span><strong>{topic.name}</strong><small>{topic.lessons.length} lessons</small><i aria-hidden="true">+</i></summary>
                <ol>{topic.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ol>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="course-final-cta"><Container className="course-final-grid"><div className="stack"><Eyebrow>{course.shortTitle}</Eyebrow><h2>Choose the access that fits where you are in your IB course.</h2><p>Three-month, one-year and recommended two-year access are available for the complete course.</p></div><div><ButtonLink href={course.teachableUrl} external>View access plans and enrol</ButtonLink><Link className="course-login-link" href="/login">Already enrolled? Go to my courses</Link></div></Container></section>
    </>
  );
}
