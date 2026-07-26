import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHero } from "@/components/ui";
import { resources } from "@/lib/content";

export const metadata: Metadata = { title: "Free IB Mathematics resources", description: "Free, expert-led IB Mathematics guides, videos and revision resources." };

export default function ResourcesPage() {
  return <><PageHero eyebrow="Free resources" title="Useful IB Mathematics help, before you buy anything." intro="Practical explanations, revision guidance and exam insight for students, parents and teachers." /><section className="section-tight"><Container className="stack-xl"><div className="grid-3">{resources.map((resource) => <Link className="card card-hover stack-lg" key={resource.slug} href={`/resources/${resource.slug}`}><div className="cluster"><span className="badge">{resource.audience}</span><span className="small muted">{resource.readTime}</span></div><div className="stack"><h3>{resource.title}</h3><p className="muted">{resource.summary}</p></div><span className="text-link">Read guide</span></Link>)}</div></Container></section></>;
}
