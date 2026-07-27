import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { SchoolTierLink } from "@/components/school-tier-link";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IB Mathematics school licences", description: "Two-year access to a selected Mr Flynn IB Mathematics course for classes, departments and school cohorts." };

const tiers = [
  { students: "10", each: "$50", total: "$500", label: "10-student package" },
  { students: "25", each: "$40", total: "$1,000", label: "25-student package" },
  { students: "50", each: "$30", total: "$1,500", label: "50-student package", popular: true },
  { students: "100", each: "$20", total: "$2,000", label: "100-student package" },
];

export default function SchoolsPage() {
  return (
    <>
      <section className="schools-hero"><Container className="schools-hero-grid"><div className="stack-lg"><Breadcrumbs items={[{ label: "Schools" }]} /><Eyebrow>For schools</Eyebrow><h1>Give every IB Mathematics student another clear explanation.</h1><p className="lede">Two-year access for a defined student cohort, with straightforward volume pricing.</p><a className="button" href="#school-options">See school options</a></div><div className="school-course-stack"><span>Available course options</span><p>Each student receives one selected course.</p><div><strong>AA HL</strong><small>Analysis & Approaches</small></div><div><strong>AA SL</strong><small>Analysis & Approaches</small></div><div><strong>AI HL</strong><small>Applications & Interpretation</small></div><div><strong>AI SL</strong><small>Applications & Interpretation</small></div></div></Container></section>

      <section className="school-benefit-strip"><Container className="grid-3"><article><strong>Two-year access</strong><span>Support students throughout their complete IB course.</span></article><article><strong>One school invoice</strong><span>Simple purchasing for each student cohort.</span></article><article><strong>Independent support</strong><span>Students can revisit explanations outside lesson time.</span></article></Container></section>

      <section id="school-options" className="section school-pricing-section"><Container className="stack-xl"><div className="section-heading-row"><div className="stack"><Eyebrow>Two-year school pricing</Eyebrow><h2>Choose the cohort size that fits.</h2></div><p className="lede">Every package covers two years of access. For more than 100 students or a different cohort structure, request a custom quotation.</p></div><div className="school-tier-grid">{tiers.map((tier) => <article className={`school-tier ${tier.popular ? "school-tier-popular" : ""}`} key={tier.students}>{tier.popular && <span className="tier-popular-label">Most popular</span>}<small>{tier.label}</small><div className="tier-students"><strong>{tier.students}</strong><span>student licences</span></div><div className="tier-price"><strong>{tier.each}</strong><span>per student / two years</span></div><div className="tier-total"><span>Package total</span><strong>{tier.total}</strong></div><SchoolTierLink students={tier.students} /></article>)}</div><p className="pricing-note">For more than 100 students, school groups or a tailored arrangement, contact us for a custom quote. Course allocation, access dates and provisioning are confirmed with the school before invoicing.</p></Container></section>

      <section className="section schools-included"><Container className="split"><div className="stack"><Eyebrow>Each student licence</Eyebrow><h2>What each student receives.</h2><p className="lede">Every licence is assigned to one selected IB Mathematics course.</p></div><ul className="check-list"><li>Two years of access</li><li>One selected course: AA HL, AA SL, AI HL or AI SL</li><li>Complete lessons across all five topic areas</li><li>Internal Assessment guidance</li><li>Past-paper solutions</li></ul></Container></section>

      <section id="school-enquiry" className="section"><Container className="split"><div className="stack-lg"><Eyebrow>Request school access</Eyebrow><h2>Tell us about your cohort.</h2><p className="lede">Share the likely number of students, courses and year groups. We will confirm the right package and practical setup before any invoice is issued.</p></div><EnquiryForm kind="school" /></Container></section>
    </>
  );
}
