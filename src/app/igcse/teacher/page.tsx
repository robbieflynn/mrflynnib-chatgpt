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
  return <>
    <section className="igcse-page-hero"><Container className="stack-lg"><Breadcrumbs items={[{ label: "IGCSE Mathematics", href: "/igcse" }, { label: "Teacher dashboard" }]} /><div className="stack"><p className="eyebrow">IGCSE teacher dashboard</p><h1>{profile.display_name ? `Welcome, ${profile.display_name}` : "Your IGCSE classes"}</h1><p className="lede">Create Edexcel IGCSE Mathematics classes, set work and follow student progress.</p></div></Container></section>
    <section className="section-tight teacher-dashboard igcse-teacher-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}{message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="teacher-layout">
        <div className="stack-lg"><div className="dashboard-section-heading"><div><p className="eyebrow">Your IGCSE classes</p><h2>Classes and assignments</h2></div></div><div className="teacher-class-grid">
          {(classes ?? []).map((item) => { const students = Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0; const assignments = Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0; return <Link className="teacher-class-card" href={`/teacher/classes/${item.id}`} key={item.id}><span className="badge">Edexcel IGCSE Mathematics</span><h3>{item.name}</h3><div className="teacher-card-stats"><span><strong>{students}</strong> students</span><span><strong>{assignments}</strong> assignments</span></div><small>Class code {item.join_code}</small><span className="text-link">Open class</span></Link>; })}
          {!classes?.length ? <div className="account-card stack"><h3>Create your first IGCSE class</h3><p className="muted">Your class will receive a code that students can use to join.</p></div> : null}
        </div></div>
        <aside className="account-card stack"><div><p className="eyebrow">New IGCSE class</p><h3>Create a class</h3></div><form action={createClass} className="stack"><input name="area" type="hidden" value="igcse" /><input name="course" type="hidden" value="IGCSE Higher" /><label className="field"><span>Class name</span><input name="name" placeholder="Year 11 Mathematics" maxLength={100} required /></label><p className="small muted">Edexcel IGCSE Mathematics</p><button className="button" type="submit">Create class</button></form></aside>
      </div>
    </Container></section>
  </>;
}
