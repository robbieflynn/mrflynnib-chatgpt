import type { Metadata } from "next";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireSignedIn } from "@/lib/account-access";
import { approvedSchools } from "@/lib/approved-schools";
import { loadApprovedSchoolAccounts } from "@/lib/school-access-overview";
import { platformProductLabels } from "@/lib/platform-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignSchoolSeat, revokeSchoolSeat } from "./actions";

export const metadata: Metadata = { title: "Schools & licences", robots: { index: false, follow: false } };

type Licence = {
  id: string;
  organization_id: string;
  product_code: string;
  status: string;
  seat_limit: number | null;
  starts_at: string;
  ends_at: string | null;
  organizations: { name: string; curriculum: string } | { name: string; curriculum: string }[] | null;
  organization_license_seats: { user_id: string; assigned_at: string; revoked_at: string | null }[];
};

const licenceFields = "id,organization_id,product_code,status,seat_limit,starts_at,ends_at,organizations(name,curriculum),organization_license_seats(user_id,assigned_at,revoked_at)";
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai" });

export default async function SchoolAccessPage() {
  const { supabase, user, profile } = await requireSignedIn("/school/access");
  const isAdmin = profile?.role === "admin";
  const { data: memberships, error: membershipError } = await supabase.from("organization_memberships")
    .select("organization_id,role,status").eq("user_id", user.id).eq("status", "active");
  const billingOrganizationIds = (memberships || []).filter((item) => item.role === "billing_contact").map((item) => item.organization_id);
  // Administrators review every licence. Seat editing still requires the existing billing membership.
  const licenceQuery = supabase.from("organization_licenses").select(licenceFields).order("starts_at", { ascending: false });
  const [{ data: licenceData, error: licenceError }, schoolAccounts] = await Promise.all([
    isAdmin ? licenceQuery : billingOrganizationIds.length
      ? licenceQuery.in("organization_id", billingOrganizationIds)
      : Promise.resolve({ data: [], error: null }),
    isAdmin ? loadApprovedSchoolAccounts(supabase) : Promise.resolve(null),
  ]);
  const licences = (licenceData || []) as unknown as Licence[];
  const studentIds = [...new Set(licences.flatMap((licence) => (licence.organization_license_seats || []).filter((seat) => !seat.revoked_at).map((seat) => seat.user_id)))];
  const { data: profiles, error: profilesError } = studentIds.length
    ? await createAdminClient().from("profiles").select("user_id,display_name,email").in("user_id", studentIds)
    : { data: [], error: null };
  const profilesById = new Map((profiles || []).map((item) => [item.user_id, item]));
  const loadError = licenceError || membershipError;

  return <>
    <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell">
      <Breadcrumbs items={[{ label: isAdmin ? "Administration" : "My account", href: isAdmin ? "/teacher/administration" : "/account/settings" }, { label: "Schools & licences" }]} />
      <div className="dashboard-hero-copy"><span className="dashboard-role-label">{isAdmin ? "Administration" : "School access"}</span><h1>{isAdmin ? "Schools & licences" : "School course access"}</h1><p>{isAdmin ? "Approved school access and allocated course licences in one place." : "Review your school’s course licences and allocated student seats."}</p></div>
    </Container></section>
    <section className="section-tight school-access-page"><Container className="stack-xl">
      {isAdmin ? <AdminNavigation current="schools" /> : null}
      {isAdmin ? <section className="school-access-section" aria-labelledby="approved-school-heading">
        <header><h2 id="approved-school-heading">Approved schools</h2><p className="muted">Complimentary Plus access through verified school email addresses. These arrangements do not use allocated seats.</p></header>
        {schoolAccounts === null ? <p className="form-message form-error" role="alert">School access totals could not be loaded. Refresh to try again.</p> : null}
        <div className="teacher-account-table-wrap"><table className="school-access-table">
          <thead><tr><th scope="col">School</th><th scope="col">Active accounts</th><th scope="col">Access arrangement</th></tr></thead>
          <tbody>{approvedSchools.map((school) => <tr key={school.domain}>
            <td><strong>{school.name}</strong><small>{school.domain}</small></td>
            <td className="school-access-count">{schoolAccounts?.get(school.domain)?.size ?? "Unavailable"}</td>
            <td>Automatic Plus access<small>Approved school email required</small></td>
          </tr>)}</tbody>
        </table></div>
        <p className="small muted">Counts include distinct accounts with current school access across IB and IGCSE. Paid purchases and individually granted access are listed under <Link className="text-link" href="/teacher/platform-access">Payments & access</Link>.</p>
      </section> : null}

      <section className="school-access-section" aria-labelledby="school-licence-heading">
        <header><h2 id="school-licence-heading">Allocated course licences</h2><p className="muted">School licences with a defined course, access period and student seats.</p></header>
        {loadError ? <p className="form-message form-error" role="alert">School licences could not be loaded. Refresh to try again.</p> : !licences.length ? <div className="school-access-empty">
          <h3>{isAdmin ? "No allocated seat licences recorded" : "No allocated licence linked to this account"}</h3>
          <p className="muted">{isAdmin ? "The approved school arrangements above remain active. A separate licence is recorded when an agreed package uses allocated student seats." : "Your school may provide access automatically through your school email. This page only lists allocated licences you manage as a billing contact."}</p>
          {!isAdmin ? <Link className="button button-secondary button-small" href="/schools#school-enquiry">Ask about school access</Link> : null}
        </div> : null}
        {profilesError ? <p className="form-message form-error" role="alert">Student details could not be loaded. Refresh to try again.</p> : null}
        {licences.map((licence) => {
          const activeSeats = (licence.organization_license_seats || []).filter((seat) => !seat.revoked_at);
          const organization = Array.isArray(licence.organizations) ? licence.organizations[0] : licence.organizations;
          const canManageSeats = billingOrganizationIds.includes(licence.organization_id);
          return <article className="dashboard-panel stack" key={licence.id}>
            <div className="dashboard-section-heading"><div><p className="eyebrow">{organization?.name || "School licence"}</p><h2>{platformProductLabels[licence.product_code] || licence.product_code}</h2><p className="small muted">{activeSeats.length} of {licence.seat_limit ?? "unlimited"} seats assigned · {dateLabel(licence.starts_at)} to {licence.ends_at ? dateLabel(licence.ends_at) : "no expiry"}</p></div><span className={`status-pill ${["active", "pilot"].includes(licence.status) ? "is-submitted" : ""}`}>{licence.status}</span></div>
            {canManageSeats ? <form className="school-seat-form" action={assignSchoolSeat}><input type="hidden" name="licenseId" value={licence.id} /><label>Student account email<input type="email" name="email" required /></label><button className="button button-small" type="submit">Assign seat</button></form> : null}
            <div className="school-seat-list">{activeSeats.map((seat) => {
              const student = profilesById.get(seat.user_id);
              return <div key={seat.user_id}><span><strong>{student?.display_name || "Student"}</strong><small>{student?.email || "Details unavailable"}</small></span>{canManageSeats ? <form action={revokeSchoolSeat}><input type="hidden" name="licenseId" value={licence.id} /><input type="hidden" name="studentId" value={seat.user_id} /><button className="text-button" type="submit">Remove seat</button></form> : null}</div>;
            })}</div>
          </article>;
        })}
      </section>
    </Container></section>
  </>;
}
