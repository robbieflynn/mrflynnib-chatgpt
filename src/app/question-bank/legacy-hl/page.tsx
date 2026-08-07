import type { Metadata } from "next";
import { QuestionBank } from "@/components/question-bank";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Legacy HL question bank",
  description: "Practise Legacy HL Mathematics questions by topic, paper and difficulty, with complete worked mark schemes.",
};

export default function LegacyQuestionBankPage() {
  return (
    <>
      <section className="question-bank-hero">
        <Container className="question-bank-hero-grid">
          <div className="stack-lg">
            <Breadcrumbs items={[{ label: "Question bank", href: "/question-bank" }, { label: "Legacy HL archive" }]} />
            <div className="cluster"><span className="free-pill">Free for students</span><Eyebrow>Legacy HL archive</Eyebrow></div>
            <h1>Practise the question. Understand the method.</h1>
            <p className="lede">Search Legacy HL Mathematics questions by topic, paper and difficulty, then open a complete worked mark scheme when you are ready.</p>
            <p className="qb-collection-note">This separate archive contains questions from four May 2014 papers. It is not labelled as a current AA or AI course.</p>
          </div>
          <div className="qb-hero-stats" aria-label="Legacy HL question bank contents">
            <div><strong>53</strong><span>questions</span></div>
            <div><strong>53</strong><span>worked mark schemes</span></div>
            <div><strong>4</strong><span>exam papers</span></div>
            <div><strong>5</strong><span>syllabus topics</span></div>
          </div>
        </Container>
      </section>
      <section className="qb-bank-section">
        <Container>
          <QuestionBank />
        </Container>
      </section>
    </>
  );
}
