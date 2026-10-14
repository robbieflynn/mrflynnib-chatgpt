import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { TeacherAccountDirectory } from "@/components/teacher-account-directory";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireAdmin } from "@/lib/account-access";
import { teacherAccountSummaries } from "@/lib/teacher-accounts";

export const metadata: Metadata = { title: "Teacher accounts", robots: { index: false, follow: false } };

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
        {!error ? <TeacherAccountDirectory accounts={accounts} /> : null}
        <div><Link className="button button-secondary button-small" href="/teacher">Back to teacher dashboard</Link></div>
      </Container>
    </section>
  </>;
}
