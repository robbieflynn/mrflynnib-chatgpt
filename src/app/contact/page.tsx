import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquiry-form";
import { Container, Eyebrow, PageHero } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Contact Mr Flynn IB about courses, tutoring, the book, school licences or partnerships." };

export default function ContactPage() {
  return <><PageHero eyebrow="Contact" title="Tell us what you need help with." intro="Course access, tutoring, school licences, the book or a general question—use the form and include enough context for a useful response." /><section className="section-tight"><Container className="split"><div className="stack-lg"><Eyebrow>Before you send</Eyebrow><h2>The fastest route may already be here.</h2><div className="card stack"><h3>Existing course student?</h3><p className="muted">Use Student login to access Teachable. For account issues, include the email used for enrolment.</p></div><div className="card stack"><h3>School or department?</h3><p className="muted">The school licence form asks the useful procurement and cohort questions.</p></div><p>Email: <a className="text-link" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p></div><EnquiryForm kind="contact" /></Container></section></>;
}
