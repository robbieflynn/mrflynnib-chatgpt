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
          <p className="muted"><strong>Last updated:</strong> 30 July 2026</p>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Who we are</h2>
            <p>Mr Flynn IB is operated by Robert Flynn. For privacy questions or requests, email <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Information we collect</h2>
            <p>We collect information you choose to provide, such as your name, email address, selected course and the contents of an enquiry. If you create a question bank account, we may also store account details, saved progress and information needed to keep the service secure.</p>
            <p>When you enroll through Teachable, we may receive limited student, enrollment, purchase and course-progress information made available to course creators. Basic technical logs may also be created when you use the website.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>How we use information</h2>
            <p>We use information to deliver requested checklists, respond to enquiries, provide and support courses or question bank access, maintain security, understand website performance and comply with legal obligations.</p>
            <p>We send marketing emails only when you have chosen to receive them or where otherwise permitted by applicable law. You can unsubscribe at any time using the link in an email.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>Services we use</h2>
            <p>We use trusted providers to operate the website and services. These currently include Vercel for hosting, MailerLite for checklist delivery, mailing lists and school enquiries, Supabase for account or enquiry data where configured, and Teachable for course checkout, enrollment and delivery. Embedded videos use YouTube&apos;s privacy-enhanced mode.</p>
            <p>These providers process information under their own terms and may process it in different countries. We share only the information reasonably needed for each service.</p>
          </section>

          <section className="stack">
            <h2 style={{ fontSize: "2rem" }}>How long we keep information</h2>
            <p>General enquiries are normally kept for up to 24 months after the last contact. Mailing-list information is kept until you unsubscribe, after which limited information may be retained to respect your choice. Account information is kept while the account is active and for a reasonable period afterwards. Records may be kept longer where required for legal, tax, security or dispute purposes.</p>
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
            <p>The website is not intended for children under 13 to create accounts or submit personal information without the involvement of a parent or guardian. A parent or guardian may contact us about a child&apos;s information at any time.</p>
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
