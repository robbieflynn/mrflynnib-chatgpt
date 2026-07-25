import type { Metadata } from "next";
import { FaqList } from "@/components/faq-list";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { faqs } from "@/lib/content";

export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers about Mr Flynn IB courses, Teachable access, tutoring, school licences and the book." };

export default function FaqPage() {
  return <><PageHero eyebrow="FAQs" title="Straight answers to sensible questions." intro="Course access, subject choice, tutoring and school licences—without vague sales language." /><section className="section-tight"><Container className="narrow stack-xl"><FaqList items={faqs} /><div className="card stack"><h3>Still need help?</h3><p className="muted">Send the specific situation and we’ll point you to the right next step.</p><ButtonLink href="/contact">Contact Mr Flynn IB</ButtonLink></div></Container></section></>;
}
