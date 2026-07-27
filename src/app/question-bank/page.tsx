import type { Metadata } from "next";
import { QuestionBank } from "@/components/question-bank";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Free IB Mathematics question bank",
  description: "Practise IB Mathematics by topic with searchable questions and complete worked mark schemes from Mr Flynn IB.",
};

export default function QuestionBankPage() {
  return (
    <>
      <section className="question-bank-hero">
        <Container className="question-bank-hero-grid">
          <div className="stack-lg">
            <Breadcrumbs items={[{ label: "Question bank" }]} />
            <div className="cluster"><span className="free-pill">Free for students</span><Eyebrow>Question bank</Eyebrow></div>
            <h1>Practise the question. Understand the method.</h1>
            <p className="lede">Search IB Mathematics questions by topic, paper and difficulty, then open a complete worked mark scheme when you are ready.</p>
            <p className="qb-collection-note">The first collection contains legacy HL questions from four May 2014 papers. More courses and sessions will be added over time.</p>
          </div>
          <div className="qb-hero-stats" aria-label="Question bank contents">
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
