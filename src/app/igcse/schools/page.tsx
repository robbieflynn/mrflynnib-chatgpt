import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "IGCSE Mathematics for schools", description: "Ask about IGCSE Mathematics course support for schools and departments." };

export default function IgcseSchoolsPage() {
  return (
    <>
      <section className="igcse-page-hero"><Container className="igcse-page-hero-grid"><div className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Schools" }]} /><div className="stack"><Eyebrow>For schools</Eyebrow><h1>Give IGCSE Mathematics students another clear explanation.</h1><p className="lede">Tell us about your year groups and likely student numbers. We will confirm the available course access and practical setup.</p></div></div><div className="igcse-page-marker" aria-hidden="true">Schools<span>03</span></div></Container></section>
      <section className="igcse-school-strip"><Container className="grid-3"><article><strong>Clear course support</strong><span>Students can revisit explanations outside lesson time.</span></article><article><strong>Built for departments</strong><span>Share your likely cohort and year groups.</span></article><article><strong>One direct enquiry</strong><span>We will confirm the available setup before anything is agreed.</span></article></Container></section>
      <section className="section igcse-school-form-section"><Container className="split"><div className="stack-lg"><Eyebrow>School enquiries</Eyebrow><h2>Tell us what your school needs.</h2><p className="lede">We have deliberately left pricing and course pathways out until the exact IGCSE offer is confirmed.</p></div><EnquiryForm kind="school" curriculum="IGCSE Mathematics" /></Container></section>
    </>
  );
}
