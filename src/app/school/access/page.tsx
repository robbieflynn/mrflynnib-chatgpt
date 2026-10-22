import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Container } from "@/components/ui";
import { requireSignedIn } from "@/lib/account-access";
import { platformProductLabels } from "@/lib/platform-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignSchoolSeat, revokeSchoolSeat } from "./actions";

export default async function SchoolAccessPage() {
  const { supabase, user } = await requireSignedIn("/school/access");
  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id,role,status,organizations(id,name,curriculum)").eq("user_id", user.id).eq("status", "active");
  const billingMemberships = (memberships || []).filter((item) => item.role === "billing_contact");
  const organizationIds = billingMemberships.map((item) => item.organization_id);
  const { data: licences } = organizationIds.length ? await supabase.from("organization_licenses").select("id,organization_id,product_code,status,seat_limit,starts_at,ends_at,organization_license_seats(user_id,assigned_at,revoked_at)").in("organization_id", organizationIds) : { data: [] };
  const studentIds = Array.from(new Set((licences || []).flatMap((licence) => (licence.organization_license_seats || []).map((seat) => seat.user_id))));
  const admin = createAdminClient();
  const { data: profiles } = admin && studentIds.length ? await admin.from("profiles").select("user_id,display_name,email").in("user_id", studentIds) : { data: [] };
  const profilesById = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
  return <><section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell"><div className="dashboard-account-row"><Link className="dashboard-back-link" href="/account">← Account</Link><AccountMenu signOutHref="/account" /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">School access</span><h1>Course licences and student seats</h1><p>Allocate purchased course seats here. Teachers still create and manage their own classes in the normal teacher dashboard.</p></div></Container></section><section className="section-tight"><Container className="stack-xl">{!billingMemberships.length ? <div className="card stack"><h2>No school licence is connected yet.</h2><p className="muted">School access is set up after an agreed quotation or invoice. This does not affect your free classes or assignments.</p><Link className="button" href="/schools#school-enquiry">Ask about school access</Link></div> : null}{(licences || []).map((licence) => { const activeSeats = (licence.organization_license_seats || []).filter((seat) => !seat.revoked_at); return <article className="dashboard-panel stack-lg" key={licence.id}><div className="dashboard-section-heading"><div><p className="eyebrow">{platformProductLabels[licence.product_code] || licence.product_code}</p><h2>{activeSeats.length} of {licence.seat_limit || "unlimited"} seats assigned</h2></div><span className="status-pill is-submitted">{licence.status}</span></div><form className="school-seat-form" action={assignSchoolSeat}><input type="hidden" name="licenseId" value={licence.id} /><label>Student account email<input type="email" name="email" required /></label><button className="button" type="submit">Assign seat</button></form><div className="school-seat-list">{activeSeats.map((seat) => { const profile = profilesById.get(seat.user_id); return <div key={seat.user_id}><span><strong>{profile?.display_name || "Student"}</strong><small>{profile?.email || ""}</small></span><form action={revokeSchoolSeat}><input type="hidden" name="licenseId" value={licence.id} /><input type="hidden" name="studentId" value={seat.user_id} /><button className="text-button" type="submit">Remove seat</button></form></div>; })}</div></article>; })}</Container></section></>;
}
