import type { Metadata } from "next";
import Link from "next/link";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";
import { Breadcrumbs, Container } from "@/components/ui";
import { getQuestionBankDashboardLink } from "@/lib/question-bank-dashboard-link";

export const metadata: Metadata = { title: "Free Edexcel IGCSE Mathematics question bank", description: "Practise Edexcel IGCSE Mathematics questions by topic and difficulty, with complete mark schemes." };

export default async function IgcseQuestionBankPage({ searchParams }: { searchParams: Promise<{ topic?: string | string[]; subtopic?: string | string[] }> }) {
  const filters = await searchParams;
  const topic = typeof filters.topic === "string" ? filters.topic : undefined;
  const subtopic = typeof filters.subtopic === "string" ? filters.subtopic : undefined;
  const dashboardLink = await getQuestionBankDashboardLink({ curriculum: "igcse" });

  return (
    <>
      <section className="igcse-qb-route-bar">
        <Container className="igcse-qb-route-bar-inner">
          <Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Question bank" }]} />
          <div className="qb-account-actions">
            {dashboardLink.signedIn ? (
              <Link className="button button-small" href={dashboardLink.href}>← Back to dashboard</Link>
            ) : (
              <Link className="button button-small" href="/igcse/account">Student sign in</Link>
            )}
            {!dashboardLink.signedIn ? (
              <Link className="button button-secondary button-small" href="/igcse/account?next=/igcse/teacher">Teacher sign in</Link>
            ) : null}
          </div>
        </Container>
      </section>
      <section className="igcse-qb-content" aria-label="Edexcel IGCSE Mathematics question bank">
        <IgcseQuestionBankEmbed topic={topic} subtopic={subtopic} />
      </section>
    </>
  );
}
