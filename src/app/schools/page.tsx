import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { SchoolTierLink } from "@/components/school-tier-link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IB Mathematics school licences", description: "Two-year access to a selected Mr Flynn IB Mathematics course for classes, departments and school cohorts." };

const tiers = [
  { students: "10", range: "10–24", each: "$50" },
  { students: "25", range: "25–49", each: "$40" },
  { students: "50", range: "50–99", each: "$30" },
  { students: "100", range: "100+", each: "$20" },
];

export default function SchoolsPage() {
  return (
    <>
      <section className="schools-hero">
        <Container className="schools-hero-shell">
          <Breadcrumbs items={[{ label: "Schools" }]} />
          <div className="schools-hero-layout">
            <div className="schools-hero-heading stack">
              <Eyebrow>For schools</Eyebrow>
              <h1>Give every IB Mathematics student another clear explanation.</h1>
            </div>
            <div className="schools-hero-details stack-lg">
              <p className="lede">Two-year access for a defined student cohort, with straightforward pricing.</p>
              <a className="button" href="#school-options">See school options</a>
              <div className="school-course-stack">
                <span>Available course options</span>
                <p>Each student receives one selected course.</p>
                <div><strong>AA HL</strong><small>Analysis &amp; Approaches</small></div>
                <div><strong>AA SL</strong><small>Analysis &amp; Approaches</small></div>
                <div><strong>AI HL</strong><small>Applications &amp; Interpretation</small></div>
                <div><strong>AI SL</strong><small>Applications &amp; Interpretation</small></div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="school-benefit-strip"><Container className="grid-3"><article><strong>Two-year access</strong><span>Support students throughout their complete IB course.</span></article><article><strong>One school invoice</strong><span>Simple purchasing for each student cohort.</span></article><article><strong>Independent support</strong><span>Students can revisit explanations outside lesson time.</span></article></Container></section>

      <section id="school-options" className="section school-pricing-section">
        <Container className="stack-xl">
          <div className="section-heading-row">
            <div className="stack"><Eyebrow>Two-year school pricing</Eyebrow><h2>Choose the cohort size that fits.</h2></div>
            <p className="lede">The price per student is based on the total number of licences required.</p>
          </div>
          <div className="school-tier-grid">
            {tiers.map((tier) => (
              <article className="school-tier" key={tier.students}>
                <small>{tier.range} students</small>
                <div className="tier-price"><strong>{tier.each}</strong><span>per student / two years</span></div>
                <SchoolTierLink students={tier.students} />
              </article>
            ))}
          </div>
          <p className="pricing-note">For example, 57 students fall within the 50–99 tier: 57 × $30 = $1,710 for two years. Course allocation, access dates and provisioning are confirmed with the school before invoicing.</p>
        </Container>
      </section>

      <section id="school-enquiry" className="section"><Container className="split"><div className="stack-lg"><Eyebrow>Request school access</Eyebrow><h2>Tell us about your cohort.</h2><p className="lede">Share the likely number of students, courses and year groups. We will confirm the right package and practical setup before any invoice is issued.</p></div><EnquiryForm kind="school" /></Container></section>
    </>
  );
}
