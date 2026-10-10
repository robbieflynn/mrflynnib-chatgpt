import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { DashboardIcon } from "@/components/dashboard-icon";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requireTeacher } from "@/lib/account-access";
import { createClass, reviewTeacherApplication } from "./actions";

export const metadata: Metadata = { title: "Teacher dashboard", robots: { index: false, follow: false } };

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, user, profile } = await requireTeacher();
  const message = await searchParams;
  const { data: classes } = await supabase.from("classes").select("id,name,course,join_code,created_at,class_memberships(count),assignments(count)").eq("teacher_id", user.id).eq("bank", "ib").eq("archived", false).order("created_at", { ascending: false });
  const { data: teacherApplications } = profile.role === "admin"
    ? await supabase.from("profiles").select("user_id,display_name,email,teacher_requested_at").eq("teacher_status", "pending").order("teacher_requested_at")
    : { data: [] };
  const totalStudents = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0), 0);
  const totalAssignments = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0), 0);

  return <>
    <section className="dashboard-hero teacher-dashboard-hero"><Container className="dashboard-hero-layout"><div className="dashboard-hero-copy"><span className="dashboard-role-label">IB teacher dashboard</span><h1>{profile.display_name ? `Welcome, ${profile.display_name}` : "Your teaching dashboard"}</h1><p>Create classes, set work from the question bank and review every student&apos;s answers and working.</p></div><div className="dashboard-hero-stats" aria-label="Teacher account summary"><div><strong>{classes?.length ?? 0}</strong><span>classes</span></div><div><strong>{totalStudents}</strong><span>students</span></div><div><strong>{totalAssignments}</strong><span>assignments</span></div></div></Container></section>
    <section className="section-tight teacher-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}
      {profile.role === "admin" ? <section className="teacher-approval-panel stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Teacher approvals</p><h2>{teacherApplications?.length ? `${teacherApplications.length} awaiting approval` : "Approvals are up to date"}</h2></div><p className="muted">We will also email you when a teacher confirms their address.</p></div>
        {teacherApplications?.length ? <div className="teacher-approval-list">{teacherApplications.map((application) => <div className="teacher-approval-row" key={application.user_id}><span><strong>{application.display_name || "Teacher applicant"}</strong><small>{application.email}{application.teacher_requested_at ? ` · Requested ${new Date(application.teacher_requested_at).toLocaleDateString("en-GB")}` : ""}</small></span><form action={reviewTeacherApplication} className="cluster"><input name="applicantId" type="hidden" value={application.user_id} /><button className="button button-small" name="decision" type="submit" value="approve">Approve</button><button className="button button-secondary button-small" name="decision" type="submit" value="decline">Decline</button></form></div>)}</div> : <div className="dashboard-approval-empty"><DashboardIcon name="check" /><span><strong>No requests need your attention</strong><small>New applications will appear here after email confirmation.</small></span></div>}
      </section> : null}
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
