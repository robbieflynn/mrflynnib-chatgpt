import type { Metadata } from "next";
import { LogoLockup, LogoMark } from "@/components/logo";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Brand preview",
  robots: { index: false, follow: false },
};

export default function BrandPreviewPage() {
  return (
    <main className="brand-preview-page">
      <Container className="stack-xl">
        <Breadcrumbs items={[{ label: "Brand preview" }]} />
        <div className="brand-preview-heading stack-lg">
          <Eyebrow>Private brand review</Eyebrow>
          <h1>A simpler Mr Flynn IB identity.</h1>
          <p className="lede">The blue mark remains recognisable. The old descriptive line is replaced by a clearer brand position that matches the website.</p>
        </div>
        <div className="brand-preview-grid">
          <article className="brand-preview-card brand-preview-recommended">
            <div className="brand-preview-label"><strong>Recommended</strong><span>Website and marketing lockup</span></div>
            <div className="brand-preview-canvas"><LogoLockup /></div>
            <p><strong>Your home for IB Mathematics</strong> describes the whole platform without turning the logo into a feature list.</p>
          </article>
          <article className="brand-preview-card">
            <div className="brand-preview-label"><strong>Alternative</strong><span>More product-led</span></div>
            <div className="brand-preview-canvas"><LogoLockup tagline="Learn and practise IB Mathematics" /></div>
            <p>Clear and functional, but less distinctive than the recommended line.</p>
          </article>
          <article className="brand-preview-card">
            <div className="brand-preview-label"><strong>Compact</strong><span>Header and smaller placements</span></div>
            <div className="brand-preview-canvas"><LogoLockup tagline={false} /></div>
            <p>The same identity without a strapline when space is tight.</p>
          </article>
          <article className="brand-preview-card brand-preview-mark-card">
            <div className="brand-preview-label"><strong>Mark</strong><span>Icon and social use</span></div>
            <div className="brand-preview-canvas brand-preview-mark"><LogoMark /></div>
            <p>The existing blue symbol remains the recognisable shorthand for Mr Flynn IB.</p>
          </article>
        </div>
        <div className="brand-preview-note"><strong>My recommendation</strong><p>Use the full lockup on the website and marketing materials, the compact wordmark in tight spaces, and the mark alone only where the brand name is already obvious.</p></div>
      </Container>
    </main>
  );
}
