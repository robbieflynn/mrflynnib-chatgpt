import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow, PageHero } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Contact", description: "Contact Mr Flynn IB about courses, tutoring, the book, school licences or partnerships." };

export default function ContactPage() {
  return <><PageHero eyebrow="Contact" title="Contact Mr Flynn IB." intro="For course questions, tutoring enquiries or general support, email us directly." /><section className="section-tight"><Container className="narrow stack-xl"><div className="card stack-lg"><div className="stack"><Eyebrow>Get in touch</Eyebrow><h2>Email us directly.</h2><p className="lede"><Link className="text-link" href="/go/contact-email">{siteConfig.email}</Link></p><p className="muted">For account support, please include the email address used for enrollment.</p></div><div className="cluster"><Link className="button" href="/go/contact-email">Email Mr Flynn IB</Link></div></div><div className="grid-2"><div className="card stack"><h3>Existing course student?</h3><p className="muted">Open Teachable to access your course and continue learning.</p><Link className="text-link" href="/go/my-courses">Go to My courses</Link></div><div className="card stack"><h3>School enquiry?</h3><p className="muted">Use the dedicated form so we have the information needed to recommend the right package.</p><Link className="text-link" href="/schools#school-enquiry">Go to school enquiries</Link></div></div></Container></section></>;
}
