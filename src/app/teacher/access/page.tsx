import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { CourseCheckoutButton } from "@/components/platform/course-checkout-button";
import { CheckoutActivationNotice } from "@/components/platform/checkout-activation-notice";
import { Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { activePlatformEntitlements, type PlatformEntitlement } from "@/lib/platform-access";
import { teacherPlusProduct } from "@/lib/platform-products";
import { redeemTeacherAccessCode } from "./actions";

export const metadata: Metadata = { title: "Teacher Plus", robots: { index: false, follow: false } };

export default async function TeacherAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireTeacher("/teacher/access", "ib");
  const query = await searchParams;
  const { data } = await supabase
    .from("platform_entitlements")
    .select("product_code,status,starts_at,expires_at")
    .eq("user_id", user.id)
    .eq("product_code", teacherPlusProduct.productCode);
  const active = activePlatformEntitlements(data as PlatformEntitlement[] | null)[0];
  const sessionId = typeof query.session_id === "string" ? query.session_id : "";
  const codeStatus = typeof query.code === "string" ? query.code : "";

  return <>
    <section className="dashboard-hero teacher-dashboard-hero teacher-plus-hero">
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row"><Link className="dashboard-back-link" href="/teacher">← Teacher dashboard</Link><AccountMenu signOutHref="/account?next=/teacher" /></div>
        <div className="dashboard-hero-copy"><span className="dashboard-role-label">Teacher Plus</span><h1>All four IB Mathematics courses</h1><p>Use every video lesson and all the extra lesson practice across AA HL, AA SL, AI HL and AI SL.</p></div>
      </Container>
    </section>
    <section className="section-tight platform-access-page"><Container className="narrow stack-xl">
      {query.checkout === "success" ? <CheckoutActivationNotice sessionId={sessionId} accessPath="/teacher/access" title="All four IB Mathematics courses" openHref="/learn/index.html?curriculum=ib&view=courses" /> : null}
      {query.checkout === "cancelled" ? <p className="form-message">Checkout was cancelled. You have not been charged.</p> : null}
      {codeStatus === "redeemed" ? <p className="form-message form-success">Teacher Plus code accepted. All four IB courses are now unlocked.</p> : null}
      {codeStatus === "already_active" ? <p className="form-message form-success">Teacher Plus is already active on this account.</p> : null}
      {codeStatus === "already_redeemed" ? <p className="form-message">This account has already used that access code.</p> : null}
      {codeStatus === "teacher_required" ? <p className="form-message form-error">That code can only be used by an approved teacher account.</p> : null}
      {["invalid", "unavailable", "error", "student_required", "course_required"].includes(codeStatus) ? <p className="form-message form-error">That Teacher Plus code is invalid, expired or no longer available.</p> : null}
      <article className={`access-course-card teacher-plus-card ${active ? "has-access" : ""}`}>
        <div><span className="course-detail-code">Teacher Plus</span><small>{active ? "Active" : "$99 · 1 year"}</small></div>
        <h2>{teacherPlusProduct.title}</h2>
        <p>Your free teacher account still includes classes, assignments and the IB Test Maker. Teacher Plus adds the complete teaching and learning content for all four IB courses.</p>
        <ul className="teacher-plus-list"><li>AA HL and AA SL</li><li>AI HL and AI SL</li><li>Every video lesson and its extra practice</li></ul>
        {active ? <div className="stack-sm"><p className="form-message form-success">Teacher Plus is active{active.expires_at ? ` until ${new Date(active.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}.</p><Link className="button" href="/learn/index.html?curriculum=ib&amp;view=courses">Open all courses</Link></div> : <CourseCheckoutButton productId={teacherPlusProduct.id} plans={teacherPlusProduct.plans.map(({ id, label, priceUsd }) => ({ id, label, priceUsd }))} />}
      </article>
      {!active ? <article className="access-code-card"><div><span className="eyebrow">Have a Teacher Plus code?</span><h2>Unlock all four courses</h2><p>Enter the code supplied by Mr Flynn IB or your school. Teacher Plus will be connected to this teacher account.</p></div><form action={redeemTeacherAccessCode}><label><span>Teacher Plus code</span><input name="accessCode" autoCapitalize="characters" autoComplete="off" placeholder="MFI-…" required /></label><button className="button" type="submit">Redeem code</button></form></article> : null}
      <p className="small muted">Teacher Plus activates as soon as secure payment succeeds. Your free classroom tools remain available whether or not you add Plus.</p>
    </Container></section>
  </>;
}
