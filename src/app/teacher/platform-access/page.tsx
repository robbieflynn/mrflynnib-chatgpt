import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { AccessCodeCreator } from "@/components/platform/access-code-creator";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireSignedIn } from "@/lib/account-access";
import { courseProducts, studentAllCoursesProduct, teacherPlusProduct } from "@/lib/platform-products";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCourseAccess, revokeCourseAccess, setAccessCodeStatus } from "./actions";

export const metadata: Metadata = { title: "Platform access", robots: { index: false, follow: false } };

type ProfileRow = { user_id: string; email: string; display_name: string; role: string };
type EntitlementRow = { id: string; user_id: string; product_code: string; status: string; source: string; starts_at: string; expires_at: string | null; created_at: string };
type PurchaseRow = { id: string; user_id: string; product_code: string; status: string; amount_total: number; amount_refunded: number; currency: string; purchased_at: string | null; created_at: string };
type AccessCodeRow = { id: string; code_hint: string; product_code: string; status: string; access_days: number | null; max_redemptions: number; redemption_count: number; expires_at: string | null; note: string; created_at: string };

const products = [...courseProducts, studentAllCoursesProduct, teacherPlusProduct];
const productLabels = new Map(products.map((product) => [product.productCode, product.shortTitle]));
const productOptions = products.map((product) => ({ productCode: product.productCode, label: `${product.shortTitle} — ${product.title}` }));
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" });

function dateLabel(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "No expiry";
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

function messageFor(query: Record<string, string | string[] | undefined>) {
  if (query.success === "access-granted") return { kind: "success", text: "Course access was added to the account." };
  if (query.success === "already-active") return { kind: "success", text: "That account already has active access to the selected product." };
  if (query.error === "account-not-found") return { kind: "error", text: "No Mr Flynn IB account was found for that email address. Ask the user to create and confirm their account first." };
  if (query.error === "teacher-required") return { kind: "error", text: "Teacher Plus can only be granted to a teacher account." };
  if (query.error) return { kind: "error", text: "The access change could not be completed. Please try again." };
  return null;
}

export default async function PlatformAccessAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireSignedIn("/teacher/platform-access", "ib");
  const { data: viewerProfile } = await supabase.from("profiles").select("role,display_name").eq("user_id", user.id).maybeSingle();
  if (viewerProfile?.role !== "admin") {
    return <>
      <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell"><div className="dashboard-account-row dashboard-account-row-with-breadcrumbs"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Platform access" }]} /><AccountMenu signOutHref="/account?next=/teacher/platform-access" /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">Administrator access</span><h1>Switch to the administrator account</h1><p>This page is available only to the main Mr Flynn IB administrator.</p></div></Container></section>
      <section className="section-tight"><Container className="narrow"><div className="account-card stack-lg"><div><p className="eyebrow">Current account</p><h2>{viewerProfile?.display_name || "Signed-in account"}</h2><p className="muted">{user.email || "No email address"} · {viewerProfile?.role || "student"}</p></div><p>Sign out using the account menu above, then sign in on this preview with <strong>mrflynnib@gmail.com</strong>. Your main account is already approved as an administrator.</p></div></Container></section>
    </>;
  }
  const query = await searchParams;
  const admin = createAdminClient();
  const [{ data: entitlementData }, { data: purchaseData }, { data: codeData, error: codeError }] = await Promise.all([
    admin.from("platform_entitlements").select("id,user_id,product_code,status,source,starts_at,expires_at,created_at").order("created_at", { ascending: false }).limit(250),
    admin.from("platform_purchases").select("id,user_id,product_code,status,amount_total,amount_refunded,currency,purchased_at,created_at").eq("livemode", true).order("created_at", { ascending: false }).limit(250),
    admin.from("platform_access_codes").select("id,code_hint,product_code,status,access_days,max_redemptions,redemption_count,expires_at,note,created_at").order("created_at", { ascending: false }).limit(250),
  ]);
  const entitlements = (entitlementData || []) as EntitlementRow[];
  const purchases = (purchaseData || []) as PurchaseRow[];
  const codes = (codeData || []) as AccessCodeRow[];
  const userIds = [...new Set([...entitlements.map((item) => item.user_id), ...purchases.map((item) => item.user_id)])];
  const { data: profileData } = userIds.length
    ? await admin.from("profiles").select("user_id,email,display_name,role").in("user_id", userIds)
    : { data: [] };
  const profiles = new Map(((profileData || []) as ProfileRow[]).map((profile) => [profile.user_id, profile]));
  const search = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const matchesSearch = (userId: string) => {
    if (!search) return true;
    const profile = profiles.get(userId);
    return `${profile?.display_name || ""} ${profile?.email || ""}`.toLowerCase().includes(search);
  };
  const visibleEntitlements = entitlements.filter((item) => matchesSearch(item.user_id));
  const visiblePurchases = purchases.filter((item) => matchesSearch(item.user_id));
  const activeCount = entitlements.filter((item) => item.status === "active").length;
  const activeCodes = codes.filter((item) => item.status === "active").length;
  const message = messageFor(query);

  return <>
    <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell"><div className="dashboard-account-row dashboard-account-row-with-breadcrumbs"><Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: "Platform access" }]} /><AccountMenu signOutHref="/account?next=/teacher/platform-access" /></div><div className="dashboard-hero-layout"><div className="dashboard-hero-copy"><span className="dashboard-role-label">Administrator</span><h1>Platform access</h1><p>Manage paid access, complimentary grants and secure redemption codes without editing the database directly.</p></div><div className="dashboard-hero-stats"><div><strong>{activeCount}</strong><span>active grants</span></div><div><strong>{purchases.filter((item) => item.status === "paid").length}</strong><span>live purchases</span></div><div><strong>{activeCodes}</strong><span>active codes</span></div></div></div></Container></section>
    <section className="section-tight teacher-dashboard platform-admin-page"><Container className="stack-xl">
      {message ? <p className={`form-message ${message.kind === "error" ? "form-error" : "form-success"}`}>{message.text}</p> : null}
      {codeError ? <p className="form-message form-error">The access-code database update has not been applied yet. Codes will appear here after the launch migration is installed.</p> : null}
      <div className="platform-admin-action-grid">
        <AccessCodeCreator products={productOptions} />
        <div className="account-card stack-lg platform-admin-form-card"><div><p className="eyebrow">Individual access</p><h2>Grant access by email</h2><p className="muted">Use this when you want to give a known account complimentary access without asking them to redeem a code.</p></div><form action={grantCourseAccess} className="stack"><label className="field"><span>Account email</span><input name="email" type="email" placeholder="student@example.com" required /></label><label className="field"><span>Access</span><select name="productCode" required>{productOptions.map((product) => <option key={product.productCode} value={product.productCode}>{product.label}</option>)}</select></label><label className="field"><span>Access period</span><select name="accessDays" defaultValue="730"><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="730">2 years</option><option value="lifetime">No expiry</option></select></label><label className="field"><span>Internal note <small>(optional)</small></span><input name="note" maxLength={500} placeholder="Reason for complimentary access" /></label><button className="button" type="submit">Grant access</button></form></div>
      </div>

      <section className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Redemption codes</p><h2>Created codes</h2></div><p className="muted">Full codes are shown once when created. This list keeps only a safe hint and the redemption history.</p></div><div className="teacher-account-table-wrap"><table className="teacher-account-table platform-admin-table"><thead><tr><th>Code</th><th>Access</th><th>Uses</th><th>Validity</th><th>Note</th><th>Status</th></tr></thead><tbody>{codes.map((code) => <tr key={code.id}><td><strong>{code.code_hint}</strong><small>Created {dateLabel(code.created_at)}</small></td><td><strong>{productLabels.get(code.product_code) || code.product_code}</strong><small>{code.access_days ? `${code.access_days} days per redemption` : "No access expiry"}</small></td><td><strong>{code.redemption_count} / {code.max_redemptions}</strong></td><td>{dateLabel(code.expires_at)}</td><td>{code.note || "—"}</td><td><span className={`account-state-badge ${code.status === "active" ? "is-positive" : "is-rejected"}`}>{code.status}</span><form action={setAccessCodeStatus} className="teacher-account-actions"><input name="codeId" type="hidden" value={code.id} /><button className={`text-button ${code.status === "active" ? "is-danger" : ""}`} name="status" value={code.status === "active" ? "disabled" : "active"}>{code.status === "active" ? "Disable" : "Enable"}</button></form></td></tr>)}{!codes.length ? <tr><td className="teacher-account-empty" colSpan={6}>No access codes have been created yet.</td></tr> : null}</tbody></table></div></section>

      <section className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Accounts and entitlements</p><h2>Course access</h2></div><form className="platform-admin-search"><input name="q" type="search" defaultValue={search} placeholder="Search name or email" /><button className="button button-secondary button-small">Search</button>{search ? <Link className="text-link" href="/teacher/platform-access">Clear</Link> : null}</form></div><div className="teacher-account-table-wrap"><table className="teacher-account-table platform-admin-table"><thead><tr><th>Account</th><th>Access</th><th>Source</th><th>Started</th><th>Expires</th><th>Status</th></tr></thead><tbody>{visibleEntitlements.map((item) => { const profile = profiles.get(item.user_id); return <tr key={item.id}><td><strong>{profile?.display_name || "Account"}</strong><small className="teacher-account-email">{profile?.email || item.user_id}</small></td><td>{productLabels.get(item.product_code) || item.product_code}</td><td>{item.source}</td><td>{dateLabel(item.starts_at)}</td><td>{dateLabel(item.expires_at)}</td><td><span className={`account-state-badge ${item.status === "active" ? "is-positive" : "is-rejected"}`}>{item.status}</span>{item.status === "active" ? <form action={revokeCourseAccess} className="teacher-account-actions"><input name="entitlementId" type="hidden" value={item.id} /><button className="text-button is-danger" type="submit">Revoke</button></form> : null}</td></tr>; })}{!visibleEntitlements.length ? <tr><td className="teacher-account-empty" colSpan={6}>No course access records match this search.</td></tr> : null}</tbody></table></div></section>

      <section className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Stripe</p><h2>Live purchase history</h2></div><p className="muted">Payments and refunds are fulfilled by the verified Stripe webhook.</p></div><div className="teacher-account-table-wrap"><table className="teacher-account-table platform-admin-table"><thead><tr><th>Customer</th><th>Product</th><th>Paid</th><th>Refunded</th><th>Date</th><th>Status</th></tr></thead><tbody>{visiblePurchases.map((item) => { const profile = profiles.get(item.user_id); return <tr key={item.id}><td><strong>{profile?.display_name || "Customer"}</strong><small className="teacher-account-email">{profile?.email || item.user_id}</small></td><td>{productLabels.get(item.product_code) || item.product_code}</td><td>{money(item.amount_total, item.currency)}</td><td>{money(item.amount_refunded, item.currency)}</td><td>{dateLabel(item.purchased_at || item.created_at)}</td><td><span className={`account-state-badge ${item.status === "paid" ? "is-positive" : item.status === "pending" ? "is-waiting" : "is-rejected"}`}>{item.status.replaceAll("_", " ")}</span></td></tr>; })}{!visiblePurchases.length ? <tr><td className="teacher-account-empty" colSpan={6}>No live Stripe purchases match this search.</td></tr> : null}</tbody></table></div></section>
    </Container></section>
  </>;
}

