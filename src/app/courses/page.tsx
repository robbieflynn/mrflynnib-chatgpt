import type { Metadata } from "next";
import { CourseCard } from "@/components/course-card";
import { ButtonLink, Container, Eyebrow, PageHero, PlaceholderNote } from "@/components/ui";
import { courses } from "@/lib/content";

export const metadata: Metadata = { title: "IB Mathematics courses", description: "Find the right Mr Flynn IB course for AA HL, AA SL, AI HL or AI SL." };

export default function CoursesPage() {
  return <>
    <PageHero eyebrow="Online courses" title="Choose the course that matches your IB pathway." intro="Clear video teaching, structured topic coverage and exam-focused practice. Course enrolment and lesson access are handled through Teachable." />
    <section className="section-tight"><Container className="stack-xl"><div className="grid-2">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div><PlaceholderNote>Replace assumed course availability with the live catalogue, add exact prices, sample videos, curriculum details and Teachable URLs.</PlaceholderNote></Container></section>
    <section className="section surface-ink"><Container className="split"><div className="stack"><Eyebrow>Not sure which course?</Eyebrow><h2>AA and AI reward different kinds of mathematical thinking.</h2><p className="lede">Use the free comparison guide or contact us with the student’s current subject choice and future study plans.</p></div><div className="cluster"><ButtonLink href="/resources/choosing-aa-or-ai">Read the AA vs AI guide</ButtonLink><ButtonLink href="/contact" secondary>Ask for guidance</ButtonLink></div></Container></section>
  </>;
}
