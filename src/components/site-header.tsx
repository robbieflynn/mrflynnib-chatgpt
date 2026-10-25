import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { MobileNavigation } from "@/components/mobile-navigation";
import { AccountMenu } from "@/components/account-menu";
import { HeaderAccountLink } from "@/components/header-account-link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="brand" aria-label={`${siteConfig.name} home`}>
          <LogoMark />
          <span className="header-brand-name"><small>Mr Flynn</small><strong>IB Mathematics</strong></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.filter((item) => item.href !== "/book").map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          <Link className="header-contact-button" href="/contact">Contact</Link>
          <Suspense fallback={null}>
            <HeaderAccountLink className="header-learning-home-link" showSignedOut={false} />
          </Suspense>
          <Suspense fallback={<Link className="button button-small header-login-button" href="/account">Log in</Link>}>
            <AccountMenu className="header-account-menu" showNavigation showSignedOut />
          </Suspense>
        </nav>
        <div className="tuition-partner-group">
          <Link href="/go/ib-tutors" className="header-tuition-link">One-to-One tuition</Link>
          <Link className="tuition-partner-logo" href="/go/ib-tutors" aria-label="Visit IB Tutors at The Tuition Centre">
            <Image src="/images/ib-tutors-logo.jpeg" alt="IB Tutors, from The Tuition Centre" width={1448} height={1086} priority />
          </Link>
        </div>
        <MobileNavigation />
      </Container>
    </header>
  );
}
