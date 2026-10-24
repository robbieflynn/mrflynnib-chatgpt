import Link from "next/link";
import { Suspense } from "react";
import { navItems, siteConfig } from "@/lib/site";
import { Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";
import { MobileNavigation } from "@/components/mobile-navigation";
import { HeaderAccountLink } from "@/components/header-account-link";

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
          <Suspense fallback={<Link className="button button-small header-login-button" href="/account">Log in</Link>}>
            <HeaderAccountLink className="button button-small header-login-button" />
          </Suspense>
        </nav>
        <MobileNavigation />
      </Container>
    </header>
  );
}
