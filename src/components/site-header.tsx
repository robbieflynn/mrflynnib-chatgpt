import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { ButtonLink, Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="brand" aria-label={`${siteConfig.name} home`}>
          <LogoLockup priority />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link className="header-contact-button" href="/contact">Contact</Link>
          <Link className="header-login-link" href="/go/my-courses">My courses</Link>
          <ButtonLink href="/courses" small>Explore courses</ButtonLink>
        </nav>
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav className="mobile-panel" aria-label="Mobile navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/tutoring">Tutoring</Link>
            <Link className="mobile-student-link" href="/go/my-courses">My courses</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </details>
      </Container>
    </header>
  );
}
