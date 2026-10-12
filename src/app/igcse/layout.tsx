import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getQuestionBankDashboardLink } from "@/lib/question-bank-dashboard-link";

export const metadata: Metadata = {
  title: { default: "IGCSE Mathematics", template: "%s | Mr Flynn IB" },
  description: "IGCSE Mathematics courses, question bank development, school support and tutoring from Mr Flynn IB.",
};

const links = [
  { href: "/igcse/courses", label: "Courses" },
  { href: "/igcse/question-bank", label: "Question bank" },
  { href: "/igcse/schools", label: "Schools" },
  { href: "/igcse/tutoring", label: "Tutoring" },
] as const;

export default async function IgcseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dashboardLink = await getQuestionBankDashboardLink({ curriculum: "igcse" });
  const questionBankHref = dashboardLink.signedIn ? dashboardLink.href : "/igcse/question-bank";

  return (
    <div className="igcse-site">
      <nav className="igcse-section-nav" aria-label="IGCSE Mathematics navigation">
        <Container className="igcse-section-nav-inner">
          <Link className="igcse-section-brand" href="/igcse"><span>Mr Flynn IB</span><strong>IGCSE Mathematics</strong></Link>
          <div className="igcse-section-links">
            {links.map((link) => (
              <Link href={link.label === "Question bank" ? questionBankHref : link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </Container>
      </nav>
      {children}
    </div>
  );
}
