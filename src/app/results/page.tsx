import type { Metadata } from "next";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { testimonials } from "@/lib/testimonials";

export const metadata: Metadata = { title: "Student experiences", description: "Read genuine experiences from IB Mathematics students who have learned with Mr Flynn IB." };

export default function ResultsPage() {
  return (
    <><section className="results-hero"><Container className="narrow stack-lg"><Eyebrow>Student experiences</Eyebrow><h1>What students say about learning with Mr Flynn IB.</h1><p className="lede">These are genuine comments supplied by students around the world. Individual experiences vary, but the themes are remarkably consistent: clarity, confidence and the ability to revisit difficult ideas.</p></Container></section><section className="section"><Container className="stack-xl"><div className="all-testimonials">{testimonials.map((testimonial) => <figure className="testimonial-card" key={`${testimonial.name}-${testimonial.location}`}><span className="quote-mark" aria-hidden="true">“</span><blockquote>{testimonial.quote}</blockquote><figcaption><strong>{testimonial.name}</strong><span>{testimonial.location}</span></figcaption></figure>)}</div><div className="centre"><ButtonLink href="/courses">Find your course</ButtonLink></div></Container></section></>
  );
}
