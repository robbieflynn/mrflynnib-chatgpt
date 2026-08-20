import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

const conversions = {
  "checklist-aa-hl": { course: "AA HL" },
  "checklist-aa-sl": { course: "AA SL" },
  "checklist-ai-hl": { course: "AI HL" },
  "checklist-ai-sl": { course: "AI SL" },
} as const;

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [...Object.keys(conversions), "school-enquiry"].map((conversion) => ({ conversion }));
}

export default async function ThankYouPage({ params }: { params: Promise<{ conversion: string }> }) {
  const { conversion } = await params;

  if (conversion === "school-enquiry") {
    return (
      <section className="section thank-you-page">
        <Container className="narrow stack-lg">
          <Eyebrow>Enquiry received</Eyebrow>
          <h1>Thank you for getting in touch.</h1>
          <p className="lede">Your school enquiry has been received. Mr Flynn IB will reply using the email address you provided.</p>
          <div className="cluster"><ButtonLink href="/schools">Return to schools</ButtonLink><ButtonLink href="/" secondary>Return home</ButtonLink></div>
        </Container>
      </section>
    );
  }

  const item = conversions[conversion as keyof typeof conversions];
  if (!item) notFound();

  return (
    <section className="section thank-you-page">
      <Container className="narrow stack-lg">
        <Eyebrow>Checklist requested</Eyebrow>
        <h1>Your syllabus checklists are ready.</h1>
        <p className="lede">Download any checklist now. We’ll also email all four to you for future reference.</p>
        <div className="cluster">
          <ButtonLink href="/downloads/mr-flynn-ib-aa-hl-syllabus-checklist.pdf">Download AA HL</ButtonLink>
          <ButtonLink href="/downloads/mr-flynn-ib-aa-sl-syllabus-checklist.pdf" secondary>Download AA SL</ButtonLink>
          <ButtonLink href="/downloads/mr-flynn-ib-ai-hl-syllabus-checklist.pdf" secondary>Download AI HL</ButtonLink>
          <ButtonLink href="/downloads/mr-flynn-ib-ai-sl-syllabus-checklist.pdf" secondary>Download AI SL</ButtonLink>
        </div>
        <div className="cluster"><ButtonLink href="/courses">Explore the courses</ButtonLink><ButtonLink href="/question-bank" secondary>Open the question bank</ButtonLink></div>
      </Container>
    </section>
  );
}
