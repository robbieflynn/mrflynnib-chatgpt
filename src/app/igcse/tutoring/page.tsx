import type { Metadata } from "next";
import { Breadcrumbs, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "IGCSE Mathematics tutoring", description: "Contact Mr Flynn IB about IGCSE Mathematics tutoring." };

export default function IgcseTutoringPage() {
  return (
    <section className="igcse-tutoring-page"><Container className="igcse-tutoring-card"><div className="igcse-tutoring-symbol" aria-hidden="true">1:1</div><div className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Tutoring" }]} /><Eyebrow>Private tutoring</Eyebrow><h1>Looking for more personal IGCSE Mathematics support?</h1><p className="lede">For more information about tutoring, please email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.</p><p>Include the student&apos;s course, current situation and time zone so the first reply can be useful.</p><ButtonLink href="/go/tutoring-email">Email about tutoring</ButtonLink></div></Container></section>
  );
}
