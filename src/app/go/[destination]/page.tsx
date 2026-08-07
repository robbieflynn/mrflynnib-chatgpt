import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OutboundRedirect } from "@/components/outbound-redirect";
import { Container, Eyebrow } from "@/components/ui";
import { outboundDestinations, type OutboundDestination } from "@/lib/outbound-destinations";

export const metadata: Metadata = {
  title: "Opening your next step",
  robots: { index: false, follow: false },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(outboundDestinations).map((destination) => ({ destination }));
}

export default async function OutboundPage({ params }: { params: Promise<{ destination: string }> }) {
  const { destination } = await params;
  const item = outboundDestinations[destination as OutboundDestination];
  if (!item) notFound();

  return (
    <section className="section outbound-page">
      <Container className="narrow stack-lg">
        <Eyebrow>Just a moment</Eyebrow>
        <h1>Opening {item.label}.</h1>
        <p className="lede">You are being sent to the correct destination now.</p>
        <div><OutboundRedirect target={item.target} /></div>
      </Container>
    </section>
  );
}
