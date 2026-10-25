import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderAccountLink } from "@/components/header-account-link";
import { LogoLockup } from "@/components/logo";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Mr Flynn IGCSE Mathematics", template: "%s | Mr Flynn IGCSE" },
  description: "IGCSE Mathematics courses, question bank development, school support and tutoring from Mr Flynn IB.",
};

const links = [
  { href: "/igcse/courses", label: "Courses" },
  { href: "/igcse/question-bank", label: "Question bank" },
  { href: "/igcse/schools", label: "Schools" },
  { href: "/igcse/tutoring", label: "Tutoring" },
] as const;

export default function IgcseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="igcse-site">
      <header className="igcse-section-nav">
        <Container className="igcse-section-nav-inner">
          <Link className="igcse-section-brand" href="/igcse"><LogoLockup priority /><span>IGCSE Mathematics</span></Link>
          <nav className="igcse-section-links" aria-label="IGCSE Mathematics navigation">
            {links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="igcse-section-actions">
            <Suspense fallback={<Link className="button button-small" href="/igcse/account">Log in</Link>}>
              <HeaderAccountLink className="button button-small" />
            </Suspense>
          </div>
        </Container>
      </header>
      {children}
      <footer className="igcse-footer"><Container className="igcse-footer-inner"><p>© {new Date().getFullYear()} Mr Flynn IGCSE Mathematics</p><div><Link href="/igcse/privacy">Privacy</Link><Link href="/igcse/terms">Terms</Link><a href="mailto:contact@mrflynnib.com">Contact</a></div></Container></footer>
    </div>
  );
}
