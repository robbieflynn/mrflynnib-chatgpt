import type { Metadata } from "next";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Free Edexcel IGCSE Mathematics question bank", description: "Practise Edexcel IGCSE Mathematics questions by topic and difficulty, with complete mark schemes." };

export default function IgcseQuestionBankPage() {
  return (
    <>
      <section className="igcse-qb-hero">
        <Container className="stack-lg">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Question bank" }]} />
          <div className="stack">
            <Eyebrow>Free question bank</Eyebrow>
            <h1>Practise Edexcel IGCSE Mathematics by topic.</h1>
            <p className="lede">Choose your course, filter the bank and work through focused questions with complete mark schemes.</p>
          </div>
        </Container>
      </section>
      <section className="igcse-qb-content" aria-label="Edexcel IGCSE Mathematics question bank">
        <iframe
          className="igcse-qb-frame"
          loading="eager"
          src="/question-bank/igcse-bank.html"
          title="Edexcel IGCSE Mathematics question bank"
        />
      </section>
    </>
  );
}
