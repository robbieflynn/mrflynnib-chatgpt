import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { StudentAccountDirectory } from "@/components/student-account-directory";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireAdmin } from "@/lib/account-access";
import { studentAccountSummaries } from "@/lib/student-accounts";

export const metadata: Metadata = { title: "Student accounts", robots: { index: false, follow: false } };

export default async function StudentAccountsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_student_accounts");
  const accounts = studentAccountSummaries(data);
  const confirmedCount = accounts.filter((account) => account.email_confirmed_at).length;
  const signedInCount = accounts.filter((account) => account.last_sign_in_at).length;
  const inClassCount = accounts.filter((account) => Number(account.class_count) > 0).length;

  return <>
    <section className="dashboard-hero teacher-dashboard-hero">
      <Container className="dashboard-hero-shell">
        <div className="dashboard-account-row dashboard-account-row-with-breadcrumbs">
          <Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: "Student accounts" }]} />
          <AccountMenu signOutHref="/account?next=/teacher" />
        </div>
        <div className="dashboard-hero-layout">
          <div className="dashboard-hero-copy"><span className="dashboard-role-label">Administrator</span><h1>Student accounts</h1><p>See every registered student and a concise overview of their account and learning activity.</p></div>
          <div className="dashboard-hero-stats" aria-label="Student account summary"><div><strong>{accounts.length}</strong><span>registered</span></div><div><strong>{signedInCount}</strong><span>signed in</span></div><div><strong>{inClassCount}</strong><span>in classes</span></div></div>
        </div>
      </Container>
    </section>
    <section className="section-tight teacher-dashboard teacher-accounts-page">
      <Container className="stack-xl">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Account directory</p><h2>All student accounts</h2></div><p className="muted">{confirmedCount} of {accounts.length} have confirmed their email address. Times are shown in Dubai time.</p></div>
        {error ? <p className="form-message form-error">Student accounts could not be loaded just now. Please reload the page.</p> : null}
        {!error ? <StudentAccountDirectory accounts={accounts} /> : null}
        <div className="cluster"><Link className="button button-secondary button-small" href="/teacher">Back to teacher dashboard</Link><Link className="button button-secondary button-small" href="/teacher/accounts">View teacher accounts</Link></div>
      </Container>
    </section>
  </>;
}
