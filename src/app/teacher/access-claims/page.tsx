import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Container } from "@/components/ui";
import { requireAdmin } from "@/lib/account-access";
import { platformProductLabels } from "@/lib/platform-access";
import { reviewAccessClaim } from "./actions";

export default async function AccessClaimsPage() {
  const { supabase } = await requireAdmin();
  const { data: claims } = await supabase.from("course_access_claims").select("id,email,note,product_code,status,created_at").order("created_at", { ascending: false });
  return <><section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell"><div className="dashboard-account-row"><Link className="dashboard-back-link" href="/teacher">← Teacher dashboard</Link><AccountMenu signOutHref="/account?next=/teacher" /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">Administration</span><h1>Existing customer transfers</h1><p>Verify a previous Teachable enrolment before granting access to the native course.</p></div></Container></section><section className="section-tight"><Container className="stack-xl"><div className="dashboard-panel stack-lg">{(claims || []).map((claim) => <article className="access-claim-row" key={claim.id}><div><strong>{claim.email}</strong><span>{platformProductLabels[claim.product_code] || claim.product_code}</span><small>{new Date(claim.created_at).toLocaleDateString("en-GB")}</small>{claim.note ? <p>{claim.note}</p> : null}</div><span className={`status-pill ${claim.status === "approved" ? "is-submitted" : ""}`}>{claim.status}</span>{claim.status === "pending" ? <form action={reviewAccessClaim}><input type="hidden" name="claimId" value={claim.id} /><button className="button button-small" name="decision" value="approved">Approve</button><button className="button button-secondary button-small" name="decision" value="declined">Decline</button></form> : null}</article>)}{!claims?.length ? <p className="muted">No transfer requests yet.</p> : null}</div></Container></section></>;
}
