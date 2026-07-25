import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container, Eyebrow, PlaceholderNote } from "@/components/ui";
import { CourseCard } from "@/components/course-card";
import { FaqList } from "@/components/faq-list";
import { courses, faqs, resources } from "@/lib/content";

const pathways = [
  {
    label: "Students",
    icon: "∑",
    title: "Learn your course clearly",
    body: "Choose AA or AI, HL or SL, then build understanding topic by topic with lessons you can replay.",
    href: "/courses",
    cta: "Find your course",
  },
  {
    label: "Parents",
    icon: "↗",
    title: "Find the right support",
    body: "Understand the options, see what is included and choose between a course and more personal support.",
    href: "/tutoring",
    cta: "Explore support",
  },
  {
    label: "Teachers",
    icon: "π",
    title: "Extend your classroom",
    body: "Give students another expert explanation, targeted revision and resources they can use independently.",
    href: "/resources",
    cta: "Browse teacher resources",
  },
  {
    label: "Schools",
    icon: "⌂",
    title: "Support a whole cohort",
    body: "Explore structured licences, teacher onboarding and a straightforward quotation process for your department.",
    href: "/schools",
    cta: "View school licences",
  },
] as const;

const platformOffers = [
  { number: "01", title: "Video courses", body: "Complete course journeys for AA and AI, delivered through Teachable.", href: "/courses" },
  { number: "02", title: "Free learning library", body: "Useful explanations, revision plans, videos and practical IB guidance.", href: "/resources" },
  { number: "03", title: "Private tutoring", body: "Selective, focused support for students who need direct diagnosis and feedback.", href: "/tutoring" },
  { number: "04", title: "School access", body: "A scalable way for departments to give students consistent expert support.", href: "/schools" },
  { number: "05", title: "Books and tools", body: "A growing collection of resources designed around the real IB Mathematics journey.", href: "/book" },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <Container className="home-hero-grid">
          <div className="home-hero-copy">
            <div className="hero-kicker"><span className="hero-kicker-dot" />The home of clear IB Mathematics</div>
            <h1>IB Maths, <span>explained properly.</span></h1>
            <p className="home-hero-lede">
              Expert-led courses, free lessons and focused support for IB Mathematics students, parents, teachers and schools.
            </p>
            <div className="cluster hero-actions">
              <ButtonLink href="/courses">Explore courses</ButtonLink>
              <ButtonLink href="/resources" secondary>Start with free resources</ButtonLink>
            </div>
            <div className="hero-trust-line">
              <div className="hero-avatar">
                <Image src="/images/rob-flynn.webp" alt="" fill sizes="48px" />
              </div>
              <p><strong>Learn with Rob Flynn</strong><span>IB teacher, examiner and moderator</span></p>
            </div>
          </div>

          <div className="platform-preview" aria-label="A preview of the Mr Flynn IB learning platform">
            <div className="platform-window-bar">
              <span className="platform-window-brand"><Image src="/images/mr-flynn-mark.png" alt="" width={27} height={24} />Mr Flynn IB</span>
              <span className="platform-window-status"><i />Lesson ready</span>
            </div>
            <div className="platform-preview-main">
              <div className="platform-portrait">
                <Image
                  src="/images/rob-flynn.webp"
                  alt="Rob Flynn, founder and teacher at Mr Flynn IB"
                  fill
                  priority
                  sizes="(max-width: 900px) 88vw, 43vw"
                />
                <div className="portrait-gradient" />
                <div className="portrait-caption">
                  <span>Today’s lesson</span>
                  <strong>Making calculus make sense</strong>
                </div>
                <button className="video-play" type="button" aria-label="Video lesson preview">▶</button>
              </div>
              <div className="platform-side-panel">
                <p className="platform-label">Your IB pathway</p>
                <div className="course-selector-card active"><span>AA</span><div><strong>Analysis & Approaches</strong><small>HL and SL</small></div></div>
                <div className="course-selector-card"><span>AI</span><div><strong>Applications & Interpretation</strong><small>HL and SL</small></div></div>
                <div className="progress-card">
                  <div><span>Course clarity</span><strong>68%</strong></div>
                  <div className="progress-track"><i /></div>
                  <small>Clear explanations. Purposeful practice. Better decisions.</small>
                </div>
              </div>
            </div>
            <div className="floating-proof floating-proof-one"><strong>1M+</strong><span>video views</span></div>
            <div className="floating-proof floating-proof-two"><span className="proof-tick">✓</span><p><strong>Examiner insight</strong><small>Built into every explanation</small></p></div>
          </div>
        </Container>
      </section>

      <section className="home-proof" aria-label="Rob Flynn's experience and reach">
        <Container className="home-proof-grid">
          <div><strong>IB examiner</strong><span>Assessment insight</span></div>
          <div><strong>IB moderator</strong><span>Standards and communication</span></div>
          <div><strong>1M+ video views</strong><span>Students around the world</span></div>
          <div><strong>Thousands taught</strong><span>Across the IB journey</span></div>
        </Container>
      </section>

      <section className="section path-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack">
              <Eyebrow>Choose your path</Eyebrow>
              <h2>One platform. Four different starting points.</h2>
            </div>
            <p className="lede">Students, parents, teachers and schools need different answers. Start with the route that matches what you are trying to do today.</p>
          </div>
          <div className="path-grid">
            {pathways.map((path) => (
              <Link className="path-card" href={path.href} key={path.label}>
                <div className="path-card-top"><span className="path-icon">{path.icon}</span><span className="path-label">{path.label}</span></div>
                <div className="stack"><h3>{path.title}</h3><p>{path.body}</p></div>
                <span className="path-link">{path.cta}<i>→</i></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="platform-section">
        <Container className="platform-section-grid">
          <div className="platform-section-copy stack-lg">
            <Eyebrow>More than a course website</Eyebrow>
            <h2>A growing home for the whole IB Mathematics journey.</h2>
            <p className="lede">Mr Flynn IB brings the important pieces together: expert teaching, independent study, personal support and school access. The website is the front door; the platform keeps expanding behind it.</p>
            <div className="cluster"><ButtonLink href="/courses">See the courses</ButtonLink><ButtonLink href="/about" secondary>Why Mr Flynn IB</ButtonLink></div>
          </div>
          <div className="platform-orbit" aria-label="The parts of the Mr Flynn IB platform">
            <div className="orbit-lines" aria-hidden="true" />
            <div className="orbit-centre"><Image src="/images/mr-flynn-mark.png" alt="Mr Flynn IB" width={76} height={68} /><strong>Mr Flynn IB</strong><span>Clear teaching at the centre</span></div>
            {platformOffers.map((offer, index) => (
              <Link className={`orbit-card orbit-card-${index + 1}`} href={offer.href} key={offer.title}>
                <span>{offer.number}</span><div><strong>{offer.title}</strong><small>{offer.body}</small></div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="section course-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Online courses</Eyebrow><h2>Your exact syllabus, organised and explained.</h2></div>
            <p className="lede">Choose AA or AI at Higher or Standard Level. Learn on your own schedule through structured video lessons hosted securely on Teachable.</p>
          </div>
          <div className="grid-4 course-grid-home">{courses.map((course) => <CourseCard key={course.slug} course={course} />)}</div>
          <PlaceholderNote>Before launch, add the live Teachable link, confirmed availability, price and genuine evidence for each course.</PlaceholderNote>
        </Container>
      </section>

      <section className="learning-section">
        <Container className="learning-grid">
          <div className="learning-copy stack-lg">
            <Eyebrow>The teaching method</Eyebrow>
            <h2>Clarity first. Then practice that actually means something.</h2>
            <p className="lede">Students often do not need more content. They need the right explanation, at the right speed, followed by questions that build judgement rather than just repetition.</p>
            <ButtonLink href="/about" secondary>Meet Rob Flynn</ButtonLink>
          </div>
          <div className="learning-steps">
            <article><span>01</span><div><h3>Understand</h3><p>Slow the idea down and see why the method works.</p></div></article>
            <article><span>02</span><div><h3>Connect</h3><p>Link new ideas to the mathematics you already know.</p></div></article>
            <article><span>03</span><div><h3>Apply</h3><p>Use carefully selected examples to build independence.</p></div></article>
            <article><span>04</span><div><h3>Perform</h3><p>Make good decisions when the question no longer looks familiar.</p></div></article>
          </div>
        </Container>
      </section>

      <section className="section resource-showcase">
        <Container className="resource-showcase-grid">
          <div className="resource-feature">
            <Image src="/images/dubai-mathematics.webp" alt="Dubai skyline with mathematical curves and coordinate axes" fill sizes="(max-width: 900px) 100vw, 48vw" />
            <div className="resource-feature-overlay" />
            <div className="resource-feature-copy"><span>Featured idea</span><h2>Mathematics is not a list of tricks.</h2><p>See how modelling, curves and interpretation connect classroom mathematics to the world around us.</p><Link href="/resources" className="resource-feature-link">Explore free resources →</Link></div>
          </div>
          <div className="resource-list-panel stack-lg">
            <div className="stack"><Eyebrow>Free learning library</Eyebrow><h2>Useful before you buy anything.</h2><p className="muted">Practical guidance should earn trust by solving a real problem—not by forcing every visitor into a sales page.</p></div>
            <div className="home-resource-list">
              {resources.map((resource) => (
                <Link href={`/resources/${resource.slug}`} key={resource.slug}>
                  <span>{resource.audience}</span><div><strong>{resource.title}</strong><small>{resource.readTime} read</small></div><i>→</i>
                </Link>
              ))}
            </div>
            <ButtonLink href="/resources" secondary>Browse the full library</ButtonLink>
          </div>
        </Container>
      </section>

      <section className="section founder-section">
        <Container className="founder-grid">
          <figure className="founder-photo">
            <Image src="/images/rob-flynn.webp" alt="Rob Flynn, IB Mathematics teacher, examiner and moderator" fill sizes="(max-width: 900px) 100vw, 42vw" />
            <figcaption><strong>Rob Flynn</strong><span>Founder and teacher</span></figcaption>
          </figure>
          <div className="founder-copy stack-lg">
            <Eyebrow>Expert-led, not anonymous</Eyebrow>
            <h2>Students learn better when the explanation feels human.</h2>
            <p className="lede">Mr Flynn IB is built around Rob’s ability to make difficult mathematics feel clear, connected and manageable—without pretending the subject is easier than it is.</p>
            <ul className="founder-points">
              <li><span>✓</span><div><strong>Experienced IB Mathematics teacher</strong><p>Teaching grounded in the real curriculum and the problems students actually face.</p></div></li>
              <li><span>✓</span><div><strong>Examiner and moderator insight</strong><p>A practical understanding of how mathematical work is communicated and assessed.</p></div></li>
              <li><span>✓</span><div><strong>Personal video teaching</strong><p>Clear explanations students can pause, replay and revisit whenever they need them.</p></div></li>
            </ul>
            <div className="cluster"><ButtonLink href="/about">Read Rob’s story</ButtonLink><ButtonLink href="/tutoring" secondary>Explore tutoring</ButtonLink></div>
          </div>
        </Container>
      </section>

      <section className="section surface faq-home">
        <Container className="faq-home-grid">
          <div className="stack"><Eyebrow>Common questions</Eyebrow><h2>Start with the practical answers.</h2><p className="lede">Where the courses live, what is covered and how schools or tutoring clients can work with Mr Flynn IB.</p><ButtonLink href="/faq" secondary>See every question</ButtonLink></div>
          <FaqList items={faqs.slice(0, 4)} />
        </Container>
      </section>

      <section className="final-cta-section">
        <Container className="final-cta-card">
          <div className="final-cta-mark"><Image src="/images/mr-flynn-mark.png" alt="" width={64} height={57} /></div>
          <div className="stack"><span>Ready when you are</span><h2>Find the clearest next step in your IB Mathematics journey.</h2></div>
          <div className="cluster"><ButtonLink href="/courses">Explore courses</ButtonLink><ButtonLink href="/resources" secondary>Use free resources first</ButtonLink></div>
        </Container>
      </section>
    </>
  );
}
