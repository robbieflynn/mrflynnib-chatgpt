import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { courses } from "@/lib/content";

export const metadata: Metadata = { title: "IB Mathematics courses", description: "Choose the complete Mr Flynn IB course for AA HL, AA SL, AI HL or AI SL. Two-year access for $79." };

export default function CoursesPage() {
  return (
    <>
      <section className="course-index-hero">
        <Container className="course-index-hero-grid">
          <div className="stack-lg"><Eyebrow>Online courses</Eyebrow><h1>Choose your exact IB Mathematics course.</h1><p className="lede">Complete, syllabus-organised video teaching for AA and AI at Higher and Standard Level. Learn throughout the full diploma, revisit difficult ideas and prepare for exams at your own pace.</p></div>
          <div className="course-index-price"><span>Most popular option</span><strong><small>$</small>79</strong><p>Two-year full access</p><del>$160</del><b>Save 50%</b></div>
        </Container>
      </section>

      <section className="section courses-page-section">
        <Container className="stack-xl">
          <div className="course-choice-note"><span>AA</span><p><strong>Analysis & Approaches</strong> emphasises algebraic methods, mathematical reasoning and calculus.</p><span>AI</span><p><strong>Applications & Interpretation</strong> emphasises modelling, statistics, technology and mathematics in context.</p></div>
          <div className="grid-2 course-index-grid">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
          <div className="course-support-note"><div><Eyebrow>Not sure which one?</Eyebrow><h2>Check the course name shown by your school.</h2><p>Your pathway and level will be written as AA HL, AA SL, AI HL or AI SL. If you are still unsure, contact us before enrolling.</p></div><ButtonLink href="mailto:contact@mrflynnib.com" secondary>Email for guidance</ButtonLink></div>
        </Container>
      </section>

      <section className="section course-inclusions-section">
        <Container className="stack-xl">
          <div className="section-heading-row"><div className="stack"><Eyebrow>Included in every course</Eyebrow><h2>Everything stays organised around your syllabus.</h2></div><p className="lede">Use the lessons alongside school teaching, when filling gaps or as a structured revision programme before exams.</p></div>
          <div className="inclusion-grid"><article><span>01</span><h3>Clear video explanations</h3><p>Rob slows down difficult ideas and works through the reasoning behind each method.</p></article><article><span>02</span><h3>Full topic structure</h3><p>Move through Number & Algebra, Functions, Geometry & Trigonometry, Statistics & Probability and Calculus.</p></article><article><span>03</span><h3>IB-focused examples</h3><p>Practise the forms of questions, notation and decisions that matter in the actual course.</p></article><article><span>04</span><h3>IA and exam support</h3><p>Connect your course learning with dedicated IA guidance, specimen work and past-paper solutions.</p></article></div>
        </Container>
      </section>
    </>
  );
}
