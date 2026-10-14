import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireAdmin } from "@/lib/account-access";
import { teacherAccountSummaries } from "@/lib/teacher-accounts";
import { reviewTeacherApplication } from "../actions";

export const metadata: Metadata = { title: "Teacher accounts", robots: { index: false, follow: false } };

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dubai",
});

function dateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Not yet";
}

function accessLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Declined";
  return "Awaiting approval";
}

export default async function TeacherAccountsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase } = await requireAdmin();
  const message = await searchParams;
  const { data, error } = await supabase.rpc("admin_teacher_accounts");
  const accounts = teacherAccountSummaries(data).filter((account) => account.role !== "admin");
  const confirmedCount = accounts.filter((account) => account.email_confirmed_at).length;
  const approvedCount = accounts.filter((account) => account.teacher_status === "approved").length;
  const signedInCount = accounts.filter((account) => account.last_sign_in_at).length;

  return <>
    <section className="dashboard-hero teacher-dashboard-hero">
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row dashboard-account-row-with-breadcrumbs">
          <Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: "Teacher accounts" }]} />
          <AccountMenu signOutHref="/account?next=/teacher" />
        </div>
        <div className="dashboard-hero-layout">
          <div className="dashboard-hero-copy"><span className="dashboard-role-label">Administrator</span><h1>Teacher accounts</h1><p>See every teacher registration, confirmation, approval and recent account activity in one place.</p></div>
          <div className="dashboard-hero-stats" aria-label="Teacher account summary"><div><strong>{accounts.length}</strong><span>registered</span></div><div><strong>{approvedCount}</strong><span>approved</span></div><div><strong>{signedInCount}</strong><span>signed in</span></div></div>
        </div>
      </Container>
    </section>
    <section className="section-tight teacher-dashboard teacher-accounts-page">
      <Container className="stack-xl">
        {message.error ? <p className="form-message form-error">{message.error}</p> : null}
        {message.success ? <p className="form-message form-success">{message.success}</p> : null}
        <div className="dashboard-section-heading"><div><p className="eyebrow">Account directory</p><h2>All teacher registrations</h2></div><p className="muted">{confirmedCount} of {accounts.length} have confirmed their email address. Times are shown in Dubai time.</p></div>
        {error ? <p className="form-message form-error">Teacher accounts could not be loaded just now. Please reload the page.</p> : null}
        {!error ? <div className="teacher-account-table-wrap">
          <table className="teacher-account-table">
            <thead><tr><th>Teacher</th><th>Area</th><th>Email</th><th>Access</th><th>Last sign-in</th><th>Activity</th><th>Admin notice</th></tr></thead>
            <tbody>
              {accounts.map((account) => <tr key={account.user_id}>
                <td><strong>{account.display_name || "Teacher applicant"}</strong><small>Registered {dateTime(account.created_at)}</small></td>
                <td><span className="status-pill">{account.curriculum === "igcse" ? "IGCSE" : "IB"}</span></td>
                <td><strong className="teacher-account-email">{account.email}</strong><span className={`account-state-badge ${account.email_confirmed_at ? "is-positive" : "is-waiting"}`}>{account.email_confirmed_at ? "Confirmed" : "Awaiting confirmation"}</span></td>
                <td><span className={`account-state-badge is-${account.teacher_status}`}>{accessLabel(account.teacher_status)}</span>{account.teacher_status === "pending" && account.email_confirmed_at ? <form action={reviewTeacherApplication} className="teacher-account-actions"><input name="applicantId" type="hidden" value={account.user_id} /><input name="returnTo" type="hidden" value="/teacher/accounts" /><button className="text-button" name="decision" type="submit" value="approve">Approve</button><button className="text-button is-danger" name="decision" type="submit" value="decline">Decline</button></form> : null}</td>
                <td>{dateTime(account.last_sign_in_at)}</td>
                <td><strong>{Number(account.class_count) || 0} classes</strong><small>{Number(account.assignment_count) || 0} assignments · {Number(account.saved_test_count) || 0} saved tests</small></td>
                <td>{account.teacher_notification_sent_at ? <><span className="account-state-badge is-positive">Sent</span><small>{dateTime(account.teacher_notification_sent_at)}</small></> : <span className="account-state-badge is-waiting">Not sent</span>}</td>
              </tr>)}
              {!accounts.length ? <tr><td colSpan={7}>No teacher registrations have been recorded.</td></tr> : null}
            </tbody>
          </table>
        </div> : null}
        <div><Link className="button button-secondary button-small" href="/teacher">Back to teacher dashboard</Link></div>
      </Container>
    </section>
  </>;
}
