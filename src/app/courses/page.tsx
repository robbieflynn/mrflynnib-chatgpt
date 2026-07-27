import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { courses } from "@/lib/content";

export const metadata: Metadata = { title: "IB Mathematics courses", description: "Choose your complete Mr Flynn IB online course: AA HL, AA SL, AI HL or AI SL." };

export default function CoursesPage() {
  return (
    <>
      <section className="course-index-hero">
        <Container className="course-index-hero-grid">
          <div className="stack-lg"><Breadcrumbs items={[{ label: "Courses" }]} /><Eyebrow>Online courses</Eyebrow><h1>Choose your course.</h1><p className="lede">Complete online courses for AA HL, AA SL, AI HL and AI SL.</p></div>
          <div className="course-existing-route"><div><strong>Already enrolled?</strong><span>Go straight to your lessons on Teachable.</span></div><ButtonLink href="/login" secondary>Go to my courses</ButtonLink></div>
        </Container>
      </section>

      <section className="section courses-page-section">
        <Container className="stack-xl">
          <div className="grid-2 course-index-grid">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
        </Container>
      </section>

      <section className="section course-inclusions-section">
        <Container className="stack-xl">
          <div className="section-heading-row"><div className="stack"><Eyebrow>Included in every course</Eyebrow><h2>Complete support for your IB Mathematics course.</h2></div><p className="lede">Learn alongside school teaching, revisit difficult topics and prepare for your final examinations.</p></div>
          <div className="inclusion-grid"><article><span>01</span><h3>Clear video explanations</h3><p>Mr Flynn IB breaks difficult ideas into clear steps and explains the reasoning behind each method.</p></article><article><span>02</span><h3>Full topic structure</h3><p>Work through the complete syllabus in a clear, organised sequence.</p></article><article><span>03</span><h3>IA guidance</h3><p>Use dedicated guidance to understand the Internal Assessment process and develop your work.</p></article><article><span>04</span><h3>Past-paper solutions</h3><p>See how IB Mathematics questions are approached and worked through clearly.</p></article></div>
        </Container>
      </section>
    </>
  );
}
