import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IB Mathematics school licences", description: "Annual access to all four Mr Flynn IB Mathematics courses for classes, departments and school cohorts." };

const tiers = [
  { students: "10", each: "$50", total: "$500", label: "Small cohort" },
  { students: "25", each: "$40", total: "$1,000", label: "Growing cohort" },
  { students: "50", each: "$30", total: "$1,500", label: "Department", popular: true },
  { students: "100", each: "$20", total: "$2,000", label: "Whole cohort" },
];

export default function SchoolsPage() {
  return (
    <>
      <section className="schools-hero"><Container className="schools-hero-grid"><div className="stack-lg"><Breadcrumbs items={[{ label: "Schools" }]} /><Eyebrow>For schools</Eyebrow><h1>Give every IB Mathematics student another clear explanation.</h1><p className="lede">Annual school access to all four complete courses, with straightforward cohort pricing and one invoice for the department.</p><a className="button" href="#school-options">See school options</a></div><div className="school-course-stack"><span>Included for every student</span><div><strong>AA HL</strong><small>Analysis & Approaches</small></div><div><strong>AA SL</strong><small>Analysis & Approaches</small></div><div><strong>AI HL</strong><small>Applications & Interpretation</small></div><div><strong>AI SL</strong><small>Applications & Interpretation</small></div></div></Container></section>

      <section className="school-benefit-strip"><Container className="grid-3"><article><strong>All four courses</strong><span>Support mixed pathways and both year groups.</span></article><article><strong>One annual invoice</strong><span>Simple purchasing for the department or school.</span></article><article><strong>Independent support</strong><span>Students can revisit explanations outside lesson time.</span></article></Container></section>

      <section id="school-options" className="section school-pricing-section"><Container className="stack-xl"><div className="section-heading-row"><div className="stack"><Eyebrow>Annual school pricing</Eyebrow><h2>Choose the cohort size that fits.</h2></div><p className="lede">Every package is priced per academic year. For more than 100 students or a different structure, request a custom quotation.</p></div><div className="school-tier-grid">{tiers.map((tier) => <article className={`school-tier ${tier.popular ? "school-tier-popular" : ""}`} key={tier.students}>{tier.popular && <span className="tier-popular-label">Most popular</span>}<small>{tier.label}</small><div className="tier-students"><strong>{tier.students}</strong><span>student licences</span></div><div className="tier-price"><strong>{tier.each}</strong><span>per student / year</span></div><div className="tier-total"><span>Annual total</span><strong>{tier.total}</strong></div><a href="#school-enquiry" className="text-link">Request this option</a></article>)}</div><p className="pricing-note">For more than 100 students, school groups or a tailored arrangement, contact us for a custom quote. Final provisioning and renewal terms are confirmed with the school before invoicing.</p></Container></section>

      <section className="section schools-included"><Container className="split"><div className="stack"><Eyebrow>Designed for departments</Eyebrow><h2>More useful than a bulk checkout.</h2><p className="lede">School access should be easy to explain, easy to purchase and genuinely useful to students across the cohort.</p></div><ul className="check-list"><li>Access to AA HL, AA SL, AI HL and AI SL</li><li>Structured lessons across all five topic areas</li><li>IA guidance and past-paper support</li><li>Centralised cohort setup</li><li>School quotation and invoice</li></ul></Container></section>

      <section id="school-enquiry" className="section"><Container className="split"><div className="stack-lg"><Eyebrow>Request school access</Eyebrow><h2>Tell us about your cohort.</h2><p className="lede">Share the likely number of students, courses and year groups. We will confirm the right package and practical setup before any invoice is issued.</p></div><EnquiryForm kind="school" /></Container></section>
    </>
  );
}
