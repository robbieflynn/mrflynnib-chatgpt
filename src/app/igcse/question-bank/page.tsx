import type { Metadata } from "next";
import Link from "next/link";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { Breadcrumbs, Container } from "@/components/ui";

export const metadata: Metadata = { title: "Free Edexcel IGCSE Mathematics question bank", description: "Practise Edexcel IGCSE Mathematics questions by topic and difficulty, with complete mark schemes." };

export default async function IgcseQuestionBankPage({ searchParams }: { searchParams: Promise<{ topic?: string | string[]; subtopic?: string | string[] }> }) {
  const filters = await searchParams;
  const topic = typeof filters.topic === "string" ? filters.topic : undefined;
  const subtopic = typeof filters.subtopic === "string" ? filters.subtopic : undefined;

  return (
    <>
      <section className="igcse-qb-route-bar">
        <Container className="igcse-qb-route-bar-inner">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Question bank" }]} />
          <Link className="button button-small" href="/account?qualification=igcse">Student dashboard</Link>
        </Container>
      </section>
      <section className="igcse-qb-content" aria-label="Edexcel IGCSE Mathematics question bank">
        <IgcseQuestionBankEmbed topic={topic} subtopic={subtopic} />
      </section>
    </>
  );
}
