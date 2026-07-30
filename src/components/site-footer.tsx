import Link from "next/link";
import { Container } from "@/components/ui";
import { LogoLockup } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer-grid">
          <div className="stack">
            <Link href="/" className="brand footer-brand"><LogoLockup /></Link>
            <p style={{ color: "rgba(255,255,255,.7)", maxWidth: 420 }}>
              Complete IB Mathematics courses, a growing question bank, IA guidance, tutoring and school access, explained clearly by Mr Flynn IB.
            </p>
            <div className="footer-socials" aria-label="Mr Flynn IB social channels">
              <Link className="footer-social-primary" href="/go/youtube">YouTube</Link>
              <Link href="/go/instagram">Instagram</Link>
              <Link href="/go/tiktok">TikTok</Link>
            </div>
          </div>
          <div className="stack">
            <strong>Learn</strong>
            <div className="footer-list"><Link href="/courses">Courses</Link><Link href="/ia">IA guidance</Link><Link href="/question-bank">Question bank</Link><Link href="/book">Book</Link><Link href="/go/my-courses">My courses</Link></div>
          </div>
          <div className="stack">
            <strong>Work with us</strong>
            <div className="footer-list"><Link href="/tutoring">Private tutoring</Link><Link href="/schools">School licences</Link><Link href="/contact">Contact</Link><Link href="/results">Results</Link></div>
          </div>
          <div className="stack">
            <strong>Company</strong>
            <div className="footer-list"><Link href="/about">About Mr Flynn IB</Link><Link href="/faq">FAQs</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.</span><span>Independent IB Mathematics support. Not affiliated with the International Baccalaureate Organization.</span></div>
      </Container>
    </footer>
  );
}
