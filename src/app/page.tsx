import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { CourseCard } from "@/components/course-card";
import { VideoEmbed } from "@/components/video-embed";
import { courses } from "@/lib/content";
import { siteConfig } from "@/lib/site";
import { testimonials } from "@/lib/testimonials";

const mainOffers = [
  {
    number: "01",
    label: "Main offering",
    title: "Online courses",
    body: "Complete AA and AI courses at Higher and Standard Level, organised by the real IB syllabus and taught by Rob Flynn.",
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
      <section className="new-hero">
        <div className="hero-math hero-math-one" aria-hidden="true">f(x)</div>
        <div className="hero-math hero-math-two" aria-hidden="true">∫</div>
        <Container className="new-hero-grid">
          <div className="new-hero-copy">
            <div className="hero-kicker"><span className="hero-kicker-dot" />Expert-led IB Mathematics</div>
            <h1>The home of <span>IB Mathematics.</span></h1>
            <p className="home-hero-lede">
              Clear courses, trusted IA guidance and focused support for students, teachers and schools—taught by Rob Flynn.
            </p>
            <div className="cluster hero-actions">
              <ButtonLink href="/courses">Find your course</ButtonLink>
              <ButtonLink href="/ia" secondary>Explore IA guidance</ButtonLink>
            </div>
            <div className="hero-credentials" aria-label="Rob Flynn's credentials">
              <span>IB teacher</span><i />
              <span>Examiner</span><i />
              <span>Moderator</span>
            </div>
          </div>

          <div className="hero-portrait-wrap">
            <div className="hero-portrait-card">
              <Image
                src="/images/rob-flynn.webp"
                alt="Rob Flynn, IB Mathematics teacher, examiner and moderator"
                fill
                priority
                sizes="(max-width: 900px) 92vw, 46vw"
              />
              <div className="hero-portrait-shade" />
              <div className="hero-portrait-caption">
                <span>Learn with</span>
                <strong>Rob Flynn</strong>
              </div>
            </div>
            <a className="hero-video-chip" href="https://www.youtube.com/watch?v=o3aDg3PZraY&list=PLcvv9pSnukaU11Abk84eQ1OZVqXsqATQh&index=3" target="_blank" rel="noreferrer">
              <span className="play-dot">▶</span>
              <span><small>Watch a free lesson</small><strong>See how Rob teaches</strong></span>
            </a>
            <div className="hero-view-chip"><strong>1M+</strong><span>YouTube views</span></div>
          </div>
        </Container>
      </section>

      <section className="proof-strip" aria-label="Why students learn with Mr Flynn IB">
        <Container className="proof-strip-grid">
          <div><strong>4</strong><span>complete IB Mathematics courses</span></div>
          <div><strong>1M+</strong><span>YouTube views worldwide</span></div>
          <div><strong>IB</strong><span>teacher, examiner and moderator insight</span></div>
          <div><strong>24/7</strong><span>replay lessons when you need them</span></div>
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

      <section className="section courses-home-section">
        <Container className="stack-xl">
          <div className="courses-heading">
            <div className="stack"><Eyebrow>Online courses</Eyebrow><h2>Your syllabus, clearly explained.</h2><p className="lede">Choose your exact pathway. Every course is organised across the five IB topic areas and delivered through Teachable.</p></div>
            <div className="price-callout"><span>Most popular access</span><strong>$79</strong><small>Two full years</small></div>
          </div>
          <div className="grid-4 course-grid-home">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
          <div className="centre"><ButtonLink href="/courses" secondary>Compare all four courses</ButtonLink></div>
        </Container>
      </section>

      <section className="ia-home-section">
        <Container className="ia-home-grid">
          <div className="ia-copy stack-lg">
            <Eyebrow>Internal Assessment</Eyebrow>
            <h2>IA guidance students around the world trust.</h2>
            <p className="lede">The IA is one of the areas that made Mr Flynn IB well known. Start with the complete video guide, explore possible ideas, then go deeper with the book.</p>
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
        <Container className="lesson-grid">
          <div className="lesson-video"><VideoEmbed title="Equation of a straight line — sample Mr Flynn IB lesson" videoId="o3aDg3PZraY" /></div>
          <div className="lesson-copy stack-lg">
            <Eyebrow>Try a lesson</Eyebrow>
            <h2>See whether Rob&apos;s teaching style works for you.</h2>
            <p className="lede">A course should earn your confidence before you buy it. Watch a full example and see the pace, explanation and worked-question approach for yourself.</p>
            <blockquote className="outcome-quote">
              <p>“Your videos made me go from a 4 at the start of the year to a 7 in my first-semester exams.”</p>
              <footer>Abdulaziz · Saudi Arabia</footer>
            </blockquote>
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

      <section className="dubai-band">
        <Image src="/images/dubai-mathematics.webp" alt="Dubai skyline with mathematical curves and coordinate axes" fill sizes="100vw" />
        <div className="dubai-band-overlay" />
        <Container className="dubai-band-copy">
          <span>Built for the real IB classroom</span>
          <h2>Expert teaching, wherever you are.</h2>
          <p>Learn at your own pace, revisit difficult ideas and keep the whole syllabus within reach.</p>
        </Container>
      </section>

      <section className="final-cta-section">
        <Container>
          <div className="final-cta-card">
            <div className="final-cta-mark"><Image src="/images/mr-flynn-mark.png" alt="" width={58} height={52} /></div>
            <div className="stack"><span>Ready to begin?</span><h2>Start with the course made for you.</h2><p>AA or AI. Higher or Standard Level. Two years of access for $79.</p></div>
            <div className="cluster"><ButtonLink href="/courses">Find your course</ButtonLink><ButtonLink href="/ia" secondary>Explore IA guidance</ButtonLink></div>
          </div>
        </Container>
      </section>
    </>
  );
}
