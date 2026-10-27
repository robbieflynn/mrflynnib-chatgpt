import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { DashboardIcon } from "@/components/dashboard-icon";
import { AccountMenu } from "@/components/account-menu";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireTeacher } from "@/lib/account-access";
import { activePlatformEntitlements, type PlatformEntitlement } from "@/lib/platform-access";
import { teacherPlusProduct } from "@/lib/platform-products";
import { teacherAccountSummaries } from "@/lib/teacher-accounts";
import { createClass } from "./actions";

export const metadata: Metadata = { title: "Teacher dashboard", robots: { index: false, follow: false } };

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, user, profile } = await requireTeacher("/teacher", "ib");
  const message = await searchParams;
  const [classesResult, teacherPlusResult] = await Promise.all([
    supabase.from("classes").select("id,name,course,join_code,created_at,class_memberships(count),assignments(count)").eq("teacher_id", user.id).eq("bank", "ib").eq("archived", false).order("created_at", { ascending: false }),
    supabase.from("platform_entitlements").select("product_code,status,starts_at,expires_at").eq("user_id", user.id).eq("product_code", teacherPlusProduct.productCode),
  ]);
  const { data: classes } = classesResult;
  const activeTeacherPlus = activePlatformEntitlements(teacherPlusResult.data as PlatformEntitlement[] | null)[0];
  const teacherAccountsResult = profile.role === "admin"
    ? await supabase.rpc("admin_teacher_accounts")
    : { data: null };
  const pendingTeacherApprovals = teacherAccountSummaries(teacherAccountsResult.data)
    .filter((account) => account.role !== "admin" && account.teacher_status === "pending" && account.email_confirmed_at)
    .length;
  const teacherPlusDetail = activeTeacherPlus?.expires_at
    ? `All four IB courses included · Active until ${new Date(activeTeacherPlus.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : "All four IB Mathematics courses included";
  const totalStudents = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0), 0);
  const totalAssignments = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0), 0);

  return <>
    <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-shell"><div className="dashboard-account-row"><div className="platform-access-summary teacher-early-access">{activeTeacherPlus ? <><span>Teacher Plus</span><small>{teacherPlusDetail}</small><span className="teacher-access-links"><Link href="/learn/index.html?curriculum=ib&amp;view=courses">Open courses</Link><Link href="/schools">School access</Link></span></> : <><span>Free teacher account</span><small>Classes, assignments and Test Maker included</small><span className="teacher-access-links"><Link href="/teacher/access">Teacher Plus</Link><Link href="/schools">School access</Link></span></>}</div><AccountMenu signOutHref="/account?next=/teacher" /></div><div className="dashboard-hero-layout"><div className="dashboard-hero-copy"><span className="dashboard-role-label">IB teacher dashboard</span><h1>{profile.display_name ? `Welcome, ${profile.display_name}` : "Your teaching dashboard"}</h1><p>Create and manage your own classes. Students join each class with the code you share.</p></div><div className="dashboard-hero-stats" aria-label="Teacher account summary"><div><strong>{classes?.length ?? 0}</strong><span>classes</span></div><div><strong>{totalStudents}</strong><span>students</span></div><div><strong>{totalAssignments}</strong><span>assignments</span></div></div></div></Container></section>
    <section className="section-tight teacher-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}
      {profile.role === "admin" ? <section className="teacher-approval-panel stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Account administration</p><h2>{pendingTeacherApprovals ? `${pendingTeacherApprovals} teacher ${pendingTeacherApprovals === 1 ? "request" : "requests"} waiting` : "Manage platform accounts and access"}</h2></div><div className="teacher-approval-heading-actions"><p className="muted">{pendingTeacherApprovals ? "These confirmed accounts still need your decision." : "Approved-school and paid teachers activate automatically. Other free teacher requests wait here."}</p><div className="cluster"><Link className="button button-secondary button-small" href="/teacher/accounts?access=pending">{pendingTeacherApprovals ? "Review teacher requests" : "Teacher approvals"}</Link><Link className="button button-secondary button-small" href="/teacher/students">Student accounts</Link></div></div></div>
        <div className="cluster"><Link className="text-link" href="/teacher/platform-access">Manage payments and course access</Link><Link className="text-link" href="/teacher/access-claims">Review Teachable access transfers</Link><Link className="text-link" href="/school/access">Manage school licences</Link></div>
      </section> : null}
      <section className="teacher-tool-banner">
        <div className="teacher-tool-banner-icon" aria-hidden="true">T</div>
        <div><p className="eyebrow">Teacher tools</p><h2>IB Test Maker</h2><p>Select questions by course, topic, difficulty and section, then save, reuse and print a professionally formatted paper.</p></div>
        <Link className="button" href="/teacher/test-maker">Open IB Test Maker</Link>
      </section>
      <div className="teacher-layout">
        <div className="stack-lg">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Classes and assignments</p><h2>Your classes</h2></div><p className="muted">Open a class to set work, share its joining code and review student progress.</p></div>
          <div className="teacher-class-grid">
            {(classes ?? []).map((item) => {
              const students = Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0;
              const assignments = Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0;
              return <Link className="teacher-class-card" href={`/teacher/classes/${item.id}`} key={item.id}>
                <div className="teacher-class-card-top"><DashboardIcon name="class" /><span className="badge">{item.course}</span></div><h3>{item.name}</h3>
                <div className="teacher-card-stats"><span><strong>{students}</strong> students</span><span><strong>{assignments}</strong> assignments</span></div>
                <small className="teacher-class-code">Class code <strong>{item.join_code}</strong></small><span className="text-link">Open class</span>
              </Link>;
            })}
            {!classes?.length ? <div className="dashboard-empty-state"><DashboardIcon name="class" /><div><strong>Create your first class</strong><p>Your class will receive a code that students can use to join.</p></div></div> : null}
          </div>
        </div>
        <aside className="account-card teacher-create-panel stack"><DashboardIcon name="add" /><div><p className="eyebrow">New class</p><h3>Create a class</h3><p className="muted small">Choose the course now. Questions and assignments will stay inside this curriculum.</p></div>
          <form action={createClass} className="stack">
            <input name="area" type="hidden" value="ib" />
            <label className="field"><span>Class name</span><input name="name" placeholder="Year 12 AA HL" maxLength={100} required /></label>
            <label className="field"><span>Course</span><select name="course" required><option value="AA HL">IB Mathematics AA HL</option><option value="AA SL">IB Mathematics AA SL</option><option value="AI HL">IB Mathematics AI HL</option><option value="AI SL">IB Mathematics AI SL</option></select></label>
            <PendingSubmitButton idleLabel="Create class" pendingLabel="Creating class…" />
          </form>
        </aside>
      </div>
    </Container></section>
  </>;
}
