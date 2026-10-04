import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ conversion: "school-enquiry" }];
}

export default async function ThankYouPage({ params }: { params: Promise<{ conversion: string }> }) {
  const { conversion } = await params;

  if (conversion !== "school-enquiry") notFound();

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
