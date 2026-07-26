import type { Metadata } from "next";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Free IB Mathematics question bank", description: "The Mr Flynn IB Mathematics question bank is being built as a free topic-by-topic practice resource." };

export default function QuestionBankPage() {
  return (
    <>
      <section className="question-bank-hero"><Container className="question-bank-hero-grid"><div className="stack-lg"><span className="free-pill">Free for students</span><Eyebrow>Question bank</Eyebrow><h1>Focused IB Mathematics practice is on the way.</h1><p className="lede">The Mr Flynn IB question bank is being built to help you practise topic by topic, see where you are getting stuck and move into the right explanation.</p><div className="cluster"><ButtonLink href="/courses">Use the complete courses</ButtonLink><ButtonLink href="mailto:contact@mrflynnib.com" secondary>Ask a question</ButtonLink></div></div><div className="question-preview" aria-label="Question bank preview"><div className="question-preview-head"><span>AA HL</span><small>Functions · Practice</small></div><div className="question-formula">f(x) = ax² + bx + c</div><div className="question-lines"><i /><i /><i /></div><div className="question-preview-foot"><span>Worked solution</span><strong>Coming soon</strong></div></div></Container></section>
      <section className="section"><Container className="stack-xl"><div className="section-heading-row"><div className="stack"><Eyebrow>What we are building</Eyebrow><h2>Practice that leads somewhere useful.</h2></div><p className="lede">The first version will be free. It will grow carefully rather than launching as a thin collection of disconnected questions.</p></div><div className="inclusion-grid"><article><span>01</span><h3>Choose your exact course</h3><p>AA HL, AA SL, AI HL or AI SL.</p></article><article><span>02</span><h3>Practise by topic</h3><p>Work within the same five-part structure used across the courses.</p></article><article><span>03</span><h3>Understand the solution</h3><p>Connect questions to clear methods and video explanations.</p></article><article><span>04</span><h3>Build over time</h3><p>Use focused practice to reveal gaps before they become exam problems.</p></article></div></Container></section>
    </>
  );
}
