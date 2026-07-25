import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Container, Eyebrow, PageHero, PlaceholderNote } from "@/components/ui";

export const metadata: Metadata = { title: "About Rob Flynn", description: "Meet Rob Flynn, the IB Mathematics teacher, examiner and moderator behind Mr Flynn IB." };

export default function AboutPage() {
  return <>
    <PageHero eyebrow="About Rob" title="The person behind the explanation." intro="Mr Flynn IB is built around a simple advantage: difficult mathematics taught personally, clearly and specifically for the IB curriculum." />
    <section className="section-tight">
      <Container className="split">
        <div className="stack-lg">
          <figure className="portrait-card">
            <div className="portrait-image-wrap">
              <Image
                src="/images/rob-flynn.webp"
                alt="Portrait of Rob Flynn"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 48vw"
                className="portrait-image"
              />
            </div>
            <figcaption>Rob Flynn — IB Mathematics teacher, examiner and moderator.</figcaption>
          </figure>
          <div className="brand-lockup-card">
            <Image
              src="/images/mr-flynn-ib-lockup.png"
              width={1400}
              height={356}
              alt="Mr Flynn IB — IB Mathematics Video Lessons, IA Guidance and Past Paper Solutions"
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          </div>
        </div>
        <div className="stack-lg"><Eyebrow>Rob Flynn</Eyebrow><h2>Experience matters most when students can feel it in the teaching.</h2><p className="lede">Rob is an experienced IB Mathematics teacher who has also worked as an examiner and moderator. He has taught and supported thousands of students, and his educational videos have received more than one million views.</p><p>His core strength is not merely knowing the syllabus. It is seeing where a student’s understanding has broken down, then explaining the idea in a way that makes the next question possible.</p><PlaceholderNote>Add a fact-checked career timeline, school experience, examining roles that may be publicly stated, qualifications, current location or teaching context if relevant.</PlaceholderNote></div>
      </Container>
    </section>
    <section className="section surface-ink"><Container className="grid-4"><div className="number-card"><strong>IB</strong><h3>Teacher</h3><p>Classroom experience across the course.</p></div><div className="number-card"><strong>IB</strong><h3>Examiner</h3><p>Insight into assessment and method.</p></div><div className="number-card"><strong>IB</strong><h3>Moderator</h3><p>Understanding of standards and communication.</p></div><div className="number-card"><strong>1M+</strong><h3>Video views</h3><p>Explanations used by students worldwide.</p></div></Container></section>
    <section className="section"><Container className="split"><div className="stack"><Eyebrow>Teaching philosophy</Eyebrow><h2>Make the idea clear enough to use independently.</h2></div><div className="stack-lg"><p className="lede">A good explanation should reduce dependence, not create it. The goal is for students to recognise structure, choose a method and communicate the mathematics without needing the teacher beside them.</p><div className="cluster"><ButtonLink href="/courses">Explore Rob’s courses</ButtonLink><ButtonLink href="/resources" secondary>Watch and read free resources</ButtonLink></div></div></Container></section>
  </>;
}
