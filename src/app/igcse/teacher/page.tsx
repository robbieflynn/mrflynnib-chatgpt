import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Container } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { createClass } from "@/app/teacher/actions";

export const metadata: Metadata = { title: "IGCSE teacher dashboard", robots: { index: false, follow: false } };

export default async function IgcseTeacherPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, profile } = await requireTeacher("/igcse/teacher");
  const message = await searchParams;
  const { data: classes } = await supabase.from("classes").select("id,name,course,join_code,created_at,class_memberships(count),assignments(count)").eq("bank", "igcse").eq("archived", false).order("created_at", { ascending: false });
  const totalStudents = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0), 0);
  const totalAssignments = (classes ?? []).reduce((total, item) => total + (Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0), 0);
  return <>
    <section className="dashboard-hero teacher-dashboard-hero teacher-dashboard-hero-igcse"><Container className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Teacher dashboard" }]} /><div className="dashboard-hero-layout"><div className="stack"><span className="dashboard-role-label">IGCSE teacher dashboard</span><h1>{profile.display_name ? `Welcome, ${profile.display_name}` : "Your teaching dashboard"}</h1><p>Create Edexcel IGCSE Mathematics classes, set work and review every student&apos;s answers and working.</p></div><div className="dashboard-hero-stats" aria-label="Teacher account summary"><div><strong>{classes?.length ?? 0}</strong><span>classes</span></div><div><strong>{totalStudents}</strong><span>students</span></div><div><strong>{totalAssignments}</strong><span>assignments</span></div></div></div></Container></section>
    <section className="section-tight teacher-dashboard igcse-teacher-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}{message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="teacher-layout">
        <div className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Your IGCSE classes</p><h2>Classes and assignments</h2></div><p className="muted">Open a class to set work, share its joining code and review student progress.</p></div><div className="teacher-class-grid">
          {(classes ?? []).map((item) => { const students = Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0; const assignments = Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0; return <Link className="teacher-class-card" href={`/teacher/classes/${item.id}`} key={item.id}><div className="teacher-class-card-top"><span className="dashboard-icon" aria-hidden="true">T</span><span className="badge">Edexcel IGCSE Mathematics</span></div><h3>{item.name}</h3><div className="teacher-card-stats"><span><strong>{students}</strong> students</span><span><strong>{assignments}</strong> assignments</span></div><small className="teacher-class-code">Class code <strong>{item.join_code}</strong></small><span className="text-link">Open class <span aria-hidden="true">→</span></span></Link>; })}
          {!classes?.length ? <div className="account-card stack"><h3>Create your first IGCSE class</h3><p className="muted">Your class will receive a code that students can use to join.</p></div> : null}
        </div></div>
        <aside className="account-card teacher-create-panel stack"><span className="dashboard-icon" aria-hidden="true">+</span><div><p className="eyebrow">New IGCSE class</p><h3>Create a class</h3><p className="muted small">This class will contain Edexcel IGCSE Mathematics questions and assignments only.</p></div><form action={createClass} className="stack"><input name="area" type="hidden" value="igcse" /><input name="course" type="hidden" value="IGCSE Higher" /><label className="field"><span>Class name</span><input name="name" placeholder="Year 11 Mathematics" maxLength={100} required /></label><p className="small muted">Edexcel IGCSE Mathematics</p><button className="button" type="submit">Create class</button></form></aside>
      </div>
    </Container></section>
  </>;
}
