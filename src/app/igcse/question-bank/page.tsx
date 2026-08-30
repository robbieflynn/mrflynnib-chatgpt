import type { Metadata } from "next";
import { IgcseQuestionBankEmbed } from "@/components/igcse-question-bank-embed";

export const metadata: Metadata = { title: "Free Edexcel IGCSE Mathematics question bank", description: "Practise Edexcel IGCSE Mathematics questions by topic and difficulty, with complete mark schemes." };

export default function IgcseQuestionBankPage() {
  return (
    <section className="igcse-qb-content" aria-label="Edexcel IGCSE Mathematics question bank">
      <IgcseQuestionBankEmbed />
    </section>
  );
}
