import type { Metadata } from "next";
import { notFound } from "next/navigation";
import curriculumData from "@/data/curricula.json";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { courses } from "@/lib/content";

type CurriculumTopic = { name: string; lessons: string[] };
const curricula = curriculumData as Record<string, CurriculumTopic[]>;

export function generateStaticParams() { return courses.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  return course ? { title: course.title, description: `${course.description} Two-year access for $${course.price}.` } : {};
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
            <div className="course-detail-proof"><span><strong>{lessonCount}</strong> syllabus lessons</span><span><strong>5</strong> topic areas</span><span><strong>2 years</strong> access</span></div>
          </div>
          <aside className="course-purchase-card">
            <span className="popular-ribbon">Most popular access</span>
            <div className="purchase-price"><del>${course.originalPrice}</del><strong>${course.price}</strong><span>USD</span></div>
            <p>One payment for two-year full access.</p>
            <ul className="check-list"><li>Complete {course.shortTitle} course</li><li>IA guidance and past-paper support</li><li>Learn at your own pace on Teachable</li><li>Revisit lessons whenever needed</li></ul>
            <ButtonLink href={course.teachableUrl} external>Enrol in {course.shortTitle}</ButtonLink>
            <small>Enrolment and secure course access continue on Teachable.</small>
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

      <section className="course-final-cta"><Container className="course-final-grid"><div className="stack"><Eyebrow>{course.shortTitle}</Eyebrow><h2>Keep the whole course within reach.</h2><p>Two-year access gives you time to learn, revisit and revise without buying the course again before your final exams.</p></div><div><strong>${course.price}</strong><span>Two-year full access</span><ButtonLink href={course.teachableUrl} external>Continue to Teachable</ButtonLink></div></Container></section>
    </>
  );
}
