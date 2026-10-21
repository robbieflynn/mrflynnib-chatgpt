import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Mr Flynn IB collects, uses and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        breadcrumbLabel="Privacy policy"
        title="Privacy policy"
        intro="A clear explanation of the information Mr Flynn IB collects and how it is used."
      />
      <section className="section-tight">
        <Container className="narrow stack-xl">
          <p className="muted"><strong>Last updated:</strong> 21 October 2026</p>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Who we are</h2>
            <p>This service is provided by Robert Flynn, operating as Mr Flynn IB. For privacy questions or requests, email <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Information we collect</h2>
            <p>We collect information you choose to provide, such as your name, email address, school, role, country and the contents of an enquiry. A Mr Flynn IB account requires a name and email address. The email address is the only direct contact detail required. We do not ask account holders for a telephone number, postal address or date of birth.</p>
            <p>To provide the question bank, classroom and assignment features, we also store service data linked to the account. This may include the selected curriculum and account role, class memberships, assignments, submitted answers, question completion and progress, saved whiteboard working, and information needed to authenticate the account and keep the service secure.</p>
            <p>When you enroll through Teachable, we may receive limited student, enrollment, purchase and course-progress information made available to course creators. Basic technical logs may also be created when you use the website.</p>
            <p>The syllabus checklists download directly from this website. You do not need to provide personal information to download them.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>How we use information</h2>
            <p>We use information to respond to enquiries, provide and support courses or question bank accounts, sync saved progress and whiteboard working, maintain security, understand website performance and comply with legal obligations.</p>
            <p>Submitting an enquiry or downloading a checklist does not subscribe you to marketing emails.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Services we use</h2>
            <p>We use trusted providers to operate the website and services. These currently include Vercel for hosting, Google Workspace for business email, Resend for transactional emails, Supabase for the account and classroom platform, and Teachable for course checkout, enrollment and delivery. Embedded videos use YouTube&apos;s privacy-enhanced mode.</p>
            <p>We share only the information reasonably needed for each service.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>How we use Supabase</h2>
            <p>Supabase provides the database and authentication service for Mr Flynn IB accounts. It is used to create and authenticate accounts, save question-bank progress and whiteboard working, and operate classes, assignments, student responses and teacher reporting.</p>
            <p>The main Supabase database, authentication data and backups for this service are hosted in the West EU (Ireland) region. Access within Mr Flynn IB is limited by account role. Students can access their own work, teachers can access information connected with students who have joined their classes and administrators can access information where needed to operate and support the service.</p>
            <p>Supabase may process limited service metadata, telemetry or support information outside the selected hosting region through its own operations and subprocessors. Account confirmation and other transactional emails are delivered using Resend. More information is available in Supabase&apos;s <a className="text-link" href="https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq">data residency and transfers information</a> and <a className="text-link" href="https://supabase.com/legal/customer-resources/data-processing-addendum">Data Processing Addendum</a>.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>International data transfers</h2>
            <p>Although the main Supabase account database is hosted in Ireland, some providers, including Teachable, Vercel, Resend and some service subprocessors, may process limited personal information outside Switzerland or the European Economic Area. Where applicable, providers use contractual or other recognised safeguards for international transfers, such as standard contractual clauses.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>How long we keep information</h2>
            <p>General enquiries are normally kept for up to 24 months after the last contact. Account information and related Supabase service data, including saved progress, assignment activity and whiteboard working, are kept while the account is active and for a reasonable period afterwards. Records may be kept longer where required for legal, tax, security or dispute purposes.</p>
          </section>

          <section className="stack" id="cookies">
            <h2 style={{ fontSize: "2rem" }}>Cookies and analytics</h2>
            <p>We use Vercel Web Analytics to understand general website usage, including page visits, referral sources, approximate location, browser and device information. Vercel provides this information in an anonymised form and does not use cookies for this service. Essential cookies may be used for security and account login. Privacy-enhanced YouTube embeds may store information when you choose to play a video. We do not currently use advertising cookies.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Your choices and rights</h2>
            <p>You may ask to access, correct or delete personal information we hold about you, object to or restrict certain uses, or withdraw consent where processing is based on consent. Email <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> and we will respond in accordance with applicable law.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Children</h2>
            <p>Children under 13 should not create an account or submit personal information without the involvement of a parent or guardian. A basic student account requires a name and email address. The service also stores the learning and classroom information described above when those features are used. We do not use account creation as marketing consent. A parent or guardian may contact us about a child&apos;s information at any time.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Changes</h2>
            <p>We may update this policy when our services or legal obligations change. The latest version will always be published on this page.</p>
          </section>
        </Container>
      </section>
    </>
  );
}
