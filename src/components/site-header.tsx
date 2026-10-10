import Image from "next/image";
import Link from "next/link";
import { navItems, siteConfig } from "@/lib/site";
import { ButtonLink, Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";
import { MobileNavigation } from "@/components/mobile-navigation";
import { AccountMenu } from "@/components/account-menu";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="brand" aria-label={`${siteConfig.name} home`}>
          <LogoLockup priority />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.filter((item) => item.href !== "/book").map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link className="header-contact-button" href="/contact">Contact</Link>
          <ButtonLink href="/courses" small>Explore courses</ButtonLink>
        </nav>
        <div className="tuition-partner-group">
          <Link href="/go/ib-tutors" className="header-tuition-link">One-to-One tuition</Link>
          <Link className="tuition-partner-logo" href="/go/ib-tutors" aria-label="Visit IB Tutors at The Tuition Centre">
            <Image src="/images/ib-tutors-logo.jpeg" alt="IB Tutors, from The Tuition Centre" width={1448} height={1086} priority />
          </Link>
        </div>
        <AccountMenu />
        <MobileNavigation />
      </Container>
    </header>
  );
}
