import Link from "next/link";
import { Container } from "@/components/ui";
import { CourseCheckoutButton } from "@/components/platform/course-checkout-button";
import { CheckoutActivationNotice } from "@/components/platform/checkout-activation-notice";
import { teacherPlusProduct } from "@/lib/platform-products";
import type { PlatformEntitlement } from "@/lib/platform-access";

export function TeacherAccessView({ active, query }: {
  active?: PlatformEntitlement;
  query: Record<string, string | string[] | undefined>;
}) {
  const courseHref = "/learn/index.html?curriculum=ib&view=courses";
  const expiry = active?.expires_at ? new Date(active.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  return <>
    <section className="dashboard-hero access-page-hero access-redesign-hero">
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row"><Link className="dashboard-back-link" href="/teacher">← Teacher dashboard</Link></div>
        <div className="dashboard-hero-copy"><span className="dashboard-role-label">Teacher Plus</span><h1>{active ? "Your teaching resources are ready" : "Complete courses for your teaching"}</h1><p>Every video lesson and its extra practice across all four IB Mathematics courses.</p></div>
      </Container>
    </section>
    <section className="section-tight platform-access-page access-redesign"><Container className="access-review-shell">
      {query.checkout === "success" ? <CheckoutActivationNotice sessionId={typeof query.session_id === "string" ? query.session_id : ""} accessPath="/teacher/access" title="All four IB Mathematics courses" openHref={courseHref} /> : null}
      {query.checkout === "cancelled" ? <p className="form-message">Checkout was cancelled. You have not been charged.</p> : null}
      <div className="access-status-line"><span><strong>{active ? "Teacher Plus · all four IB courses" : "Standard teacher account"}</strong><span>{active ? expiry ? `Active until ${expiry}` : "Your course access is active" : "Question bank, classes, assignments and Test Maker included"}</span></span><Link href="/teacher">Teacher dashboard ↗</Link></div>
      <div className="access-offer-layout">
        <div className="access-offer-main">
          <div className="access-included-courses" aria-label="All four courses included"><span>AA HL</span><span>AA SL</span><span>AI HL</span><span>AI SL</span></div>
          <article className="access-offer-copy">
            <span className="access-offer-label">One plan · all four courses</span>
            <h2>All four IB Mathematics courses</h2>
            <p>Clear explanations and lesson practice, ready when you need them.</p>
            <ul className="access-benefits">
              <li><span aria-hidden="true">01</span><div><strong>Every video lesson</strong><p>Explore the complete AA HL, AA SL, AI HL and AI SL video courses.</p></div></li>
              <li><span aria-hidden="true">02</span><div><strong>Extra practice for each lesson</strong><p>Use the practice questions attached to the lessons to support your teaching.</p></div></li>
              <li><span aria-hidden="true">03</span><div><strong>Your classroom tools stay together</strong><p>Keep your existing classes, assignments and Test Maker alongside the complete courses.</p></div></li>
            </ul>
          </article>
        </div>
        <aside className={`access-purchase-panel ${active ? "has-access" : ""}`} aria-label="Teacher Plus access">
          {active ? <><span className="access-active-badge">✓ Access active</span><h3>Your courses are ready.</h3><p>{expiry ? `Access until ${expiry}.` : "All four IB courses are unlocked."}</p><Link className="button" href={courseHref}>Open all courses</Link><small>No additional purchase needed.</small></> : <><span className="access-offer-label">Teacher Plus</span><h3>All four courses included</h3><p>One plan for AA and AI, at SL and HL.</p><CourseCheckoutButton compact productId={teacherPlusProduct.id} plans={teacherPlusProduct.plans} /><Link className="access-sample-link" href={courseHref}>Explore sample lessons →</Link></>}
        </aside>
      </div>
      <div className="access-help"><details><summary>What happens to my existing teacher tools?</summary><div className="access-help-content"><p>Your question bank, classes, assignments and Test Maker remain available with Standard access. Teacher Plus adds the complete video courses and extra lesson practice.</p></div></details></div>
    </Container></section>
  </>;
}
