import { ButtonLink, Container, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return <section className="section"><Container className="narrow stack-lg"><Eyebrow>404</Eyebrow><h1>This page has wandered off syllabus.</h1><p className="lede">The page you were looking for does not exist or has moved.</p><div className="cluster"><ButtonLink href="/">Return home</ButtonLink><ButtonLink href="/courses" secondary>Browse courses</ButtonLink></div></Container></section>;
}
