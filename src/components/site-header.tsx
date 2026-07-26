import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { ButtonLink, Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="brand" aria-label={`${siteConfig.name} home`}>
          <LogoLockup />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link href="/login">Student login</Link>
          <ButtonLink href="/courses" small>Explore courses</ButtonLink>
        </nav>
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav className="mobile-panel" aria-label="Mobile navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/tutoring">Tutoring</Link>
            <Link href="/login">Student login</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </details>
      </Container>
    </header>
  );
}
