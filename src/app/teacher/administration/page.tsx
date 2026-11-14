import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container } from "@/components/ui";
import { AdminNavigation, AdministrationCards } from "@/components/admin-navigation";
import { requireAdmin } from "@/lib/account-access";

export const metadata: Metadata = { title: "Account administration", robots: { index: false, follow: false } };

export default async function AdministrationPage() {
  await requireAdmin();
  return <>
    <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell">
      <Breadcrumbs items={[{ label: "Teacher home", href: "/teacher" }, { label: "Administration" }]} />
      <div className="dashboard-hero-copy"><span className="dashboard-role-label">Administrator</span><h1>Accounts & access</h1><p>Teachers, students and course access, together in one place.</p></div>
    </Container></section>
    <section className="section-tight"><Container className="stack-xl">
      <AdminNavigation current="overview" />
      <div className="dashboard-section-heading"><div><h2>Account administration</h2><p className="muted">Choose an area to manage.</p></div><Link className="button button-secondary button-small" href="/teacher/accounts?access=pending">Teacher approvals</Link></div>
      <AdministrationCards />
    </Container></section>
  </>;
}
