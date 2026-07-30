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
        <h1>Your {item.course} checklist is on its way.</h1>
        <p className="lede">Check your inbox for the email from Mr Flynn IB. If it does not appear shortly, please check your spam or promotions folder.</p>
        <div className="cluster"><ButtonLink href="/courses">Explore the courses</ButtonLink><ButtonLink href="/question-bank" secondary>Open the question bank</ButtonLink></div>
      </Container>
    </section>
  );
}
