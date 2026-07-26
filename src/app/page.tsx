import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { VideoEmbed } from "@/components/video-embed";
import { siteConfig } from "@/lib/site";
import { testimonials } from "@/lib/testimonials";

const mainOffers = [
  {
    number: "01",
    label: "Main offering",
    title: "Online courses",
    body: "Complete AA and AI courses at Higher and Standard Level, organised around the real IB syllabus.",
    href: "/courses",
    cta: "Find your course",
    className: "offer-card-primary",
  },
  {
    number: "02",
    label: "Free for now",
    title: "Question bank",
    body: "Build fluency with focused IB Mathematics questions and clear routes through each topic.",
    href: "/question-bank",
    cta: "Explore the question bank",
    className: "",
  },
  {
    number: "03",
    label: "For departments",
    title: "Schools",
    body: "Give a whole cohort access to every course with simple annual pricing and one school invoice.",
    href: "/schools",
    cta: "View school options",
    className: "",
  },
  {
    number: "04",
    label: "Personal support",
    title: "Tutoring",
    body: "Contact Mr Flynn IB directly to discuss focused individual support and current availability.",
    href: "/tutoring",
    cta: "Ask about tutoring",
    className: "",
  },
] as const;

const featuredTestimonials = testimonials.filter((testimonial) => testimonial.featured);

export default function HomePage() {
  return (
    <>
      <section className="new-hero new-hero-simple">
        <div className="hero-math hero-math-one" aria-hidden="true">f(x)</div>
        <div className="hero-math hero-math-two" aria-hidden="true">∫</div>
        <Container className="new-hero-grid new-hero-grid-simple">
          <div className="new-hero-copy">
            <h1>The home of <span>IB Mathematics.</span></h1>
            <p className="home-hero-lede">
              Complete IB Mathematics courses, trusted IA guidance and focused support for students, teachers and schools.
            </p>
            <div className="cluster hero-actions">
              <ButtonLink href="/courses">Find your course</ButtonLink>
              <ButtonLink href="/ia" secondary>Explore IA guidance</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="section offers-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Start here</Eyebrow><h2>What do you need today?</h2></div>
            <p className="lede">Choose the route that matches your goal. Courses are the complete learning experience; the other areas give you more focused support.</p>
          </div>
          <div className="offer-grid">
            {mainOffers.map((offer) => (
              <Link className={`offer-card ${offer.className}`.trim()} href={offer.href} key={offer.title}>
                <div className="offer-card-top"><span>{offer.number}</span><small>{offer.label}</small></div>
                <div className="stack"><h3>{offer.title}</h3><p>{offer.body}</p></div>
                <span className="offer-link">{offer.cta}<i aria-hidden="true">→</i></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="section who-section" id="about-mr-flynn">
        <Container className="who-grid">
          <div className="stack-lg">
            <Eyebrow>Who is Mr Flynn?</Eyebrow>
            <h2>Experienced IB insight, explained clearly.</h2>
            <p className="lede">Mr Flynn is an experienced IB Mathematics teacher, examiner and IA moderator whose lessons have helped students around the world understand difficult ideas more clearly.</p>
            <ButtonLink href="/about" secondary>About Mr Flynn</ButtonLink>
          </div>
          <div className="who-proof-grid" aria-label="Mr Flynn's experience">
            <article><span>01</span><strong>Experienced teacher</strong><p>Years of classroom experience teaching the IB Mathematics curriculum.</p></article>
            <article><span>02</span><strong>IB examiner</strong><p>Assessment insight grounded in direct experience of IB Mathematics examinations.</p></article>
            <article><span>03</span><strong>IA moderator</strong><p>Clear guidance on what strong Internal Assessments need to demonstrate.</p></article>
            <article className="who-proof-featured"><span>1M+</span><strong>YouTube views</strong><p>Trusted explanations watched by IB Mathematics students around the world.</p></article>
          </div>
        </Container>
      </section>

      <section className="dubai-band dubai-band-home">
        <Image src="/images/dubai-mathematics.webp" alt="Dubai skyline with mathematical curves and coordinate axes" fill sizes="100vw" />
        <div className="dubai-band-overlay" />
        <Container className="dubai-band-copy">
          <span>Built for the real IB classroom</span>
          <h2>Expert teaching, wherever you are.</h2>
          <p>Learn at your own pace, revisit difficult ideas and keep the whole syllabus within reach.</p>
        </Container>
      </section>

      <section className="ia-home-section">
        <Container className="ia-home-grid">
          <div className="ia-copy stack-lg">
            <Eyebrow>Internal Assessment</Eyebrow>
            <h2>IA guidance students around the world trust.</h2>
            <p className="lede">Start with the complete video guide, explore possible ideas, then go deeper with the book.</p>
            <div className="cluster"><ButtonLink href="/ia">Explore the IA hub</ButtonLink><ButtonLink href="/book" secondary>See the IA book</ButtonLink></div>
          </div>
          <div className="ia-route-grid">
            <a className="ia-route-card" href="https://www.youtube.com/watch?v=pp_CLHH8OgY&list=PLcvv9pSnukaVkFh_OkFceh0aD9Ov02UjV" target="_blank" rel="noreferrer">
              <span className="ia-card-number">01</span>
              <div><small>Playlist</small><h3>The complete IA guide</h3><p>Work through the full process, one clear stage at a time.</p></div>
              <strong>Watch on YouTube →</strong>
            </a>
            <a className="ia-route-card ia-route-card-light" href="https://www.youtube.com/watch?v=e5cLTtFzKnI&list=PLcvv9pSnukaVyAMiGPRxJsh6L2wydKFPm" target="_blank" rel="noreferrer">
              <span className="ia-card-number">02</span>
              <div><small>Playlist</small><h3>IA ideas and modelling</h3><p>See how promising mathematical ideas can become strong explorations.</p></div>
              <strong>Explore ideas →</strong>
            </a>
          </div>
        </Container>
      </section>

      <section className="section lesson-section">
        <Container className="stack-xl">
          <div className="section-heading-row lesson-heading">
            <div className="stack"><Eyebrow>Example lesson</Eyebrow><h2>Watch a complete lesson.</h2></div>
            <p className="lede">See the pace, explanation and worked-question approach before choosing a course.</p>
          </div>
          <div className="lesson-grid lesson-grid-feature">
            <div className="lesson-video"><VideoEmbed title="Equation of a straight line — sample Mr Flynn IB lesson" videoId="o3aDg3PZraY" /></div>
            <div className="lesson-result-panel stack-lg">
              <Eyebrow>Student experience</Eyebrow>
              <h3>Clear explanations can change how Mathematics feels.</h3>
              <blockquote className="outcome-quote">
                <p>“Your videos made me go from a 4 at the start of the year to a 7 in my first-semester exams.”</p>
                <footer>Abdulaziz · Saudi Arabia</footer>
              </blockquote>
            </div>
          </div>
        </Container>
      </section>

      <section className="section testimonials-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Student experiences</Eyebrow><h2>Clear explanations. Real confidence.</h2></div>
            <p className="lede">Students use Mr Flynn IB to fill gaps, prepare for assessments and understand what moved too quickly in class.</p>
          </div>
          <div className="testimonial-grid">
            {featuredTestimonials.map((testimonial) => (
              <figure className="testimonial-card" key={testimonial.name}>
                <span className="quote-mark" aria-hidden="true">“</span>
                <blockquote>{testimonial.quote}</blockquote>
                <figcaption><strong>{testimonial.name}</strong><span>{testimonial.location}</span></figcaption>
              </figure>
            ))}
          </div>
          <div className="centre"><ButtonLink href="/results" secondary>Read more student experiences</ButtonLink></div>
        </Container>
      </section>

      <section className="section book-home-section">
        <Container className="book-home-grid">
          <div className="book-home-visual">
            <div className="book-shadow" />
            <Image src="/images/ib-mathematics-ia-book-cover.jpg" alt="Cover of IB Mathematics IA: The Complete Guide to the Internal Assessment by Robert Flynn" width={481} height={680} sizes="(max-width: 800px) 62vw, 360px" />
          </div>
          <div className="stack-lg">
            <Eyebrow>The IA book</Eyebrow>
            <h2>The complete guide to the Internal Assessment.</h2>
            <p className="lede">A practical, 320-page guide that breaks the Maths IA into clear, manageable stages and explains what examiners are looking for.</p>
            <ul className="check-list book-points"><li>Clear stages from choosing an idea to the final submission</li><li>Examiner-informed guidance and real mathematical examples</li><li>Written specifically for IB Mathematics students</li></ul>
            <div className="cluster"><ButtonLink href="/book">Learn about the book</ButtonLink><ButtonLink href={siteConfig.bookUrl} secondary external>View on Amazon</ButtonLink></div>
          </div>
        </Container>
      </section>
    </>
  );
}
