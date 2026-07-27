import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "IB Mathematics tutoring", description: "Contact Mr Flynn IB for information about IB Mathematics tutoring." };

export default function TutoringPage() {
  return (
    <section className="tutoring-simple-page"><Container className="tutoring-simple-card"><div className="tutoring-symbol" aria-hidden="true">1:1</div><div className="stack-lg"><Breadcrumbs items={[{ label: "Tutoring" }]} /><Eyebrow>Private tutoring</Eyebrow><h1>Looking for more personal support?</h1><p className="lede">For more information about tutoring, please email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p><p>Tell us the student&apos;s course, current situation and time zone so the first reply can be useful.</p><ButtonLink href={`mailto:${siteConfig.email}`}>Email about tutoring</ButtonLink></div></Container></section>
  );
}
