import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow, PlaceholderNote } from "@/components/ui";
import { CourseCard } from "@/components/course-card";
import { FaqList } from "@/components/faq-list";
import { courses, faqs, resources } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <Container className="hero-grid">
          <div className="hero-copy">
            <Eyebrow>Expert IB Mathematics support</Eyebrow>
            <h1>IB Maths, <em>explained properly.</em></h1>
            <p className="lede">Clear video courses, focused tutoring and practical resources from Rob Flynn—an experienced IB teacher, examiner and moderator.</p>
            <div className="cluster"><ButtonLink href="/courses">Find your course</ButtonLink><ButtonLink href="/resources" secondary>Explore free resources</ButtonLink></div>
            <p className="small muted">Already enrolled? <Link className="text-link" href="/login">Log in through Teachable</Link></p>
          </div>
          <div className="hero-visual hero-photo-stage" aria-label="Rob Flynn, founder of Mr Flynn IB">
            <div className="hero-photo-wrap">
              <Image
                src="/images/rob-flynn.webp"
                alt="Rob Flynn, IB Mathematics teacher and founder of Mr Flynn IB"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 46vw"
                className="hero-photo"
              />
            </div>
            <div className="hero-credential-card stack">
              <span className="badge">Meet your teacher</span>
              <div>
                <strong>Rob Flynn</strong>
                <p className="small muted">IB teacher, examiner and moderator</p>
              </div>
            </div>
            <div className="lesson-card stack">
              <div className="cluster"><span className="play">▶</span><div><strong>Personal video lessons</strong><p className="small muted">Pause, replay and return whenever you need.</p></div></div>
              <div style={{ height: 7, borderRadius: 99, background: "#e3e8ea" }}><div style={{ width: "68%", height: "100%", borderRadius: 99, background: "var(--teal)" }} /></div>
            </div>
          </div>
        </Container>
      </section>

      <section className="proof-strip" aria-label="Experience and reach">
        <Container className="grid-4">
          <div className="proof-item"><p className="proof-number">IB examiner</p><p className="small muted">Assessment insight built into the teaching.</p></div>
          <div className="proof-item"><p className="proof-number">IB moderator</p><p className="small muted">A clear understanding of standards and communication.</p></div>
          <div className="proof-item"><p className="proof-number">1M+ views</p><p className="small muted">Mathematics explanations watched around the world.</p></div>
          <div className="proof-item"><p className="proof-number">Thousands taught</p><p className="small muted">Experience supporting students across the IB journey.</p></div>
        </Container>
      </section>

      <section className="section">
        <Container className="stack-xl">
          <div className="stack"><Eyebrow>Choose your route</Eyebrow><h2>The right support depends on where you are.</h2><p className="lede">The site separates student, parent and school journeys instead of forcing everyone through the same sales page.</p></div>
          <div className="grid-3">
            <article className="card card-hover stack"><span className="icon-box">∑</span><h3>I’m an IB student</h3><p className="muted">Find your course, strengthen difficult topics and revise with a plan.</p><Link className="text-link" href="/courses">Explore student courses</Link></article>
            <article className="card card-hover stack"><span className="icon-box">↗</span><h3>I’m a parent</h3><p className="muted">Understand the options and find focused support without guesswork.</p><Link className="text-link" href="/tutoring">View tutoring support</Link></article>
            <article className="card card-hover stack"><span className="icon-box">⌂</span><h3>I represent a school</h3><p className="muted">Give students structured resources while saving teacher planning time.</p><Link className="text-link" href="/schools">Explore school licences</Link></article>
          </div>
        </Container>
      </section>

      <section className="section surface">
        <Container className="stack-xl">
          <div className="stack"><Eyebrow>Online courses</Eyebrow><h2>Your syllabus, organised and explained.</h2><p className="lede">Course pages live here. Secure enrolment and lesson access continue on Teachable, so the learning experience stays familiar and reliable.</p></div>
          <div className="grid-4">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
          <PlaceholderNote>Confirm which of AA HL, AA SL, AI HL and AI SL are currently live, then add each Teachable sales URL, price and genuine student testimonials.</PlaceholderNote>
        </Container>
      </section>

      <section className="section surface-ink">
        <Container className="split">
          <div className="stack-lg"><Eyebrow>Why the teaching works</Eyebrow><h2>Not more content. Better explanation.</h2><p className="lede">Students often do not need another worksheet. They need someone to slow the idea down, show the connection and explain why a method works before asking them to reproduce it under exam pressure.</p><ButtonLink href="/about" secondary>Meet Rob Flynn</ButtonLink></div>
          <div className="grid-2">
            <div className="number-card"><strong>01</strong><h3>Understand</h3><p style={{ color: "rgba(255,255,255,.72)" }}>A clear explanation that removes the mystery.</p></div>
            <div className="number-card"><strong>02</strong><h3>Apply</h3><p style={{ color: "rgba(255,255,255,.72)" }}>Worked examples chosen for the exact skill.</p></div>
            <div className="number-card"><strong>03</strong><h3>Practise</h3><p style={{ color: "rgba(255,255,255,.72)" }}>Questions that build independence and judgement.</p></div>
            <div className="number-card"><strong>04</strong><h3>Perform</h3><p style={{ color: "rgba(255,255,255,.72)" }}>Exam technique grounded in how marks are awarded.</p></div>
          </div>
        </Container>
      </section>

      <section className="section">
        <Container className="stack-xl">
          <div className="stack"><Eyebrow>More ways to work with Mr Flynn IB</Eyebrow><h2>Courses are only one part of the platform.</h2></div>
          <div className="grid-3">
            <article className="card card-hover stack-lg"><div className="stack"><span className="badge">Personal support</span><h3>Private tutoring</h3><p className="muted">Selective, focused support for students who need diagnosis, accountability and direct feedback.</p></div><Link className="text-link" href="/tutoring">Apply for tutoring</Link></article>
            <article className="card card-hover stack-lg"><div className="stack"><span className="badge">For departments</span><h3>School licences</h3><p className="muted">Structured access for cohorts, with onboarding and a straightforward quotation process.</p></div><Link className="text-link" href="/schools">See school options</Link></article>
            <article className="card card-hover stack-lg"><div className="stack"><span className="badge">Read and revise</span><h3>Rob’s book</h3><p className="muted">A dedicated home for the book, sample pages, reviews and purchasing information.</p></div><Link className="text-link" href="/book">Explore the book</Link></article>
          </div>
        </Container>
      </section>

      <section className="section surface-soft">
        <Container className="stack-xl">
          <div className="split">
            <div className="stack-lg"><div className="stack"><Eyebrow>Free resources</Eyebrow><h2>Useful before you buy anything.</h2><p className="lede">Practical articles and videos should earn trust by solving real IB Mathematics problems—not by pretending every page needs an immediate sale.</p><ButtonLink href="/resources">Browse all resources</ButtonLink></div><figure className="featured-resource-image"><Image src="/images/dubai-mathematics.webp" width={1191} height={562} alt="A Dubai skyline photograph overlaid with mathematical curves and coordinate axes" sizes="(max-width: 900px) 100vw, 48vw" /><figcaption>Real-world mathematics: modelling curves against the Dubai skyline.</figcaption></figure></div>
            <div className="stack">
              {resources.map((resource) => <Link key={resource.slug} href={`/resources/${resource.slug}`} className="card card-hover stack"><div className="cluster"><span className="badge">{resource.audience}</span><span className="small muted">{resource.readTime}</span></div><h3>{resource.title}</h3><p className="muted">{resource.summary}</p></Link>)}
            </div>
          </div>
        </Container>
      </section>

      <section className="section surface">
        <Container className="split">
          <div className="stack-lg"><Eyebrow>Student results</Eyebrow><h2>Proof should come from real outcomes.</h2><p className="lede">The visual system is ready for concise, attributable testimonials and specific improvements. Until genuine evidence is supplied, the site labels this section rather than inventing claims.</p><ButtonLink href="/results" secondary>See the results page</ButtonLink></div>
          <div className="card stack-lg"><p className="quote">“Add a short, genuine student or parent quotation here—ideally with course, exam session, starting point and outcome.”</p><PlaceholderNote>Provide 6–10 permission-cleared testimonials. Strong evidence beats anonymous superlatives.</PlaceholderNote></div>
        </Container>
      </section>

      <section className="section">
        <Container className="narrow stack-xl">
          <div className="stack"><Eyebrow>Common questions</Eyebrow><h2>Clear answers before the next step.</h2></div>
          <FaqList items={faqs.slice(0, 4)} />
          <Link className="text-link" href="/faq">View all FAQs</Link>
        </Container>
      </section>

      <section className="section surface-teal">
        <Container className="split">
          <div className="stack"><Eyebrow>Start in the right place</Eyebrow><h2>Find the support that matches your course.</h2><p className="lede">Choose your IB Mathematics pathway and see the course structure before moving securely to Teachable.</p></div>
          <div className="cluster"><ButtonLink href="/courses">Find your course</ButtonLink><ButtonLink href="/contact" secondary>Ask a question</ButtonLink></div>
        </Container>
      </section>
    </>
  );
}
