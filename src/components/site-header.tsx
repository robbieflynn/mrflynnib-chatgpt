import Image from "next/image";
import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";
import { MobileNavigation } from "@/components/mobile-navigation";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="brand" aria-label={`${siteConfig.name} home`}>
          <LogoLockup priority />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.filter((item) => item.href !== "/ia" && item.href !== "/book").map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <button type="button" className="tuition-nav" disabled title="Partner sign-up link coming soon">One-to-one tuition</button>
          <Link className="header-contact-button" href="/contact">Contact</Link>
          <Link className="header-login-link" href="/go/my-courses">My courses</Link>
          <details className="header-more">
            <summary>More</summary>
            <div className="header-more-panel">
              <Link href="/ia">IA guidance</Link>
              <Link href="/book">Book</Link>
            </div>
          </details>
        </nav>
        <div className="tuition-partner-logo" title="IB Tutors partner link coming soon">
          <Image src="/images/ib-tutors-logo.jpeg" alt="IB Tutors, from The Tuition Centre" width={1448} height={1086} priority />
        </div>
        <MobileNavigation />
      </Container>
    </header>
  );
}
