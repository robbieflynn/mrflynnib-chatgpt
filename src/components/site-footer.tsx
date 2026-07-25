import Link from "next/link";
import { Container } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer-grid">
          <div className="stack">
            <Link href="/" className="brand"><LogoMark /><span>Mr Flynn IB</span></Link>
            <p style={{ color: "rgba(255,255,255,.7)", maxWidth: 420 }}>
              Expert-led IB Mathematics courses, tutoring, resources and school access—explained clearly by Rob Flynn.
            </p>
          </div>
          <div className="stack">
            <strong>Learn</strong>
            <div className="footer-list"><Link href="/courses">Courses</Link><Link href="/resources">Free resources</Link><Link href="/book">Book</Link><Link href="/login">Student login</Link></div>
          </div>
          <div className="stack">
            <strong>Work with us</strong>
            <div className="footer-list"><Link href="/tutoring">Private tutoring</Link><Link href="/schools">School licences</Link><Link href="/contact">Contact</Link><Link href="/results">Results</Link></div>
          </div>
          <div className="stack">
            <strong>Company</strong>
            <div className="footer-list"><Link href="/about">About Rob</Link><Link href="/faq">FAQs</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></div>
          </div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.</span><span>Independent IB Mathematics support. Not affiliated with the International Baccalaureate Organization.</span></div>
      </Container>
    </footer>
  );
}
