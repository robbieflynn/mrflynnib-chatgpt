import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Container, Eyebrow, PlaceholderNote } from "@/components/ui";
import { courses } from "@/lib/content";

export function generateStaticParams() { return courses.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  return course ? { title: course.title, description: course.description } : {};
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();

  return <>
    <section className="page-hero"><Container className="split"><div className="stack-lg"><Eyebrow>{course.shortTitle} online course</Eyebrow><h1>{course.title}</h1><p className="lede">{course.promise}</p><div className="cluster"><ButtonLink href={course.teachableUrl} external>View enrolment on Teachable</ButtonLink><ButtonLink href="#curriculum" secondary>See the curriculum</ButtonLink></div><p className="small muted">Course sales and lesson access continue securely on Teachable.</p></div><div className="card stack-lg"><span className="badge">Course overview</span><p>{course.description}</p><ul className="check-list">{course.outcomes.map((item) => <li key={item}>{item}</li>)}</ul></div></Container></section>
    <section className="section surface"><Container className="split"><div className="stack"><Eyebrow>Who it is for</Eyebrow><h2>For students who want the syllabus to make sense.</h2><p className="lede">This positioning assumes the course supports current {course.shortTitle} students alongside school teaching, independent revision and exam preparation.</p></div><div className="grid-2"><article className="card stack"><h3>Use it throughout the course</h3><p className="muted">Revisit explanations when a school lesson moves too quickly or a topic has not settled.</p></article><article className="card stack"><h3>Use it for revision</h3><p className="muted">Work topic by topic, then combine skills through exam-style practice.</p></article></div></Container></section>
    <section id="curriculum" className="section"><Container className="stack-xl"><div className="stack"><Eyebrow>Curriculum</Eyebrow><h2>Full-course structure, not disconnected videos.</h2></div><div className="grid-3">{course.modules.map((module, index) => <article className="card stack" key={module}><span className="badge">Module {index + 1}</span><h3>{module}</h3><p className="muted">Add lesson-level curriculum detail and preview links from the live Teachable course.</p></article>)}</div></Container></section>
    <section className="section surface-soft"><Container className="split"><div className="stack"><Eyebrow>What is included</Eyebrow><h2>A repeatable route from explanation to exam question.</h2></div><ul className="check-list"><li>Personal video explanations from Rob Flynn</li><li>Worked examples selected for each skill</li><li>Topic-by-topic practice guidance</li><li>Exam technique and common-error warnings</li><li>Access through the existing Teachable platform</li></ul></Container></section>
    <section className="section"><Container className="narrow stack-xl"><PlaceholderNote>Add the exact course price, access period, lesson count, downloadable resources, sample lesson, refund terms and genuine testimonials before publishing.</PlaceholderNote><div className="card stack-lg"><Eyebrow>Ready to see the full course?</Eyebrow><h2>Continue to Teachable.</h2><p className="lede">Review the final price and enrolment details on the secure course page.</p><ButtonLink href={course.teachableUrl} external>View {course.shortTitle} on Teachable</ButtonLink></div></Container></section>
  </>;
}
