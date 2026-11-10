import type { Metadata } from "next";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { StudentAccountDirectory } from "@/components/student-account-directory";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireAdmin } from "@/lib/account-access";
import type { StudentAccessRecord } from "@/lib/student-accounts";
import { studentAccountSummaries } from "@/lib/student-accounts";

export const metadata: Metadata = { title: "Student accounts", robots: { index: false, follow: false } };

export default async function StudentAccountsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase } = await requireAdmin();
  const message = await searchParams;
  // Server request snapshot keeps expiry classification consistent across all rows.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const { data, error } = await supabase.rpc("admin_student_accounts");
  const accounts = studentAccountSummaries(data);
  let accessError = false;
  // Paginate both sources: Supabase caps rows even when no limit is requested.
  const accessByUser = new Map<string, StudentAccessRecord[]>();
  for (const table of ["platform_entitlements", "organization_license_seats"]) {
    for (let offset = 0; ; offset += 500) {
      const fields = table === "platform_entitlements"
        ? "id,user_id,product_code,status,source,starts_at,expires_at"
        : "license_id,user_id,revoked_at,organization_licenses(product_code,status,starts_at,ends_at)";
      const request = supabase.from(table).select(fields);
      const ordered = table === "platform_entitlements" ? request.order("id") : request.order("license_id").order("user_id");
      const result = await ordered.range(offset, offset + 499);
      if (result.error) { accessError = true; break; }
      for (const value of result.data || []) {
        const row = value as unknown as StudentAccessRecord & { user_id: string; revoked_at?: string; organization_licenses?: { product_code: string; status: string; starts_at: string; ends_at: string | null } };
        let record: StudentAccessRecord = row;
        if (table === "organization_license_seats") {
          const licence = row.organization_licenses;
          if (!licence || row.revoked_at) continue;
          record = { ...licence, source: "licence", status: licence.status === "pilot" ? "active" : licence.status, expires_at: licence.ends_at };
        }
        const records = accessByUser.get(row.user_id) || [];
        records.push(record);
        accessByUser.set(row.user_id, records);
      }
      if ((result.data?.length || 0) < 500) break;
    }
  }
  if (!accessError) for (const account of accounts) account.access = accessByUser.get(account.user_id) || [];
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
        {message.error ? <p className="form-message form-error">{message.error}</p> : null}
        {message.success ? <p className="form-message form-success">{message.success}</p> : null}
        <div className="dashboard-section-heading"><div><p className="eyebrow">Account directory</p><h2>All student accounts</h2></div><p className="muted">{confirmedCount} of {accounts.length} have confirmed their email address. Times are shown in Dubai time.</p></div>
        {error ? <p className="form-message form-error">Student accounts could not be loaded just now. Please reload the page.</p> : null}
        {accessError ? <p className="form-message form-error">Access details could not be loaded. Reload to view access filters and expiry dates.</p> : null}
        {!error ? <StudentAccountDirectory accounts={accounts} now={now} /> : null}
        <div className="cluster"><Link className="button button-secondary button-small" href="/teacher">Back to teacher dashboard</Link><Link className="button button-secondary button-small" href="/teacher/accounts">View teacher accounts</Link></div>
      </Container>
    </section>
  </>;
}
