import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHero } from "@/components/ui";
import { requireTeacher } from "@/lib/account-access";
import { createClass } from "./actions";

export const metadata: Metadata = { title: "Teacher dashboard", robots: { index: false, follow: false } };

export default async function TeacherPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, profile } = await requireTeacher();
  const message = await searchParams;
  const { data: classes } = await supabase.from("classes").select("id,name,course,join_code,created_at,class_memberships(count),assignments(count)").eq("archived", false).order("created_at", { ascending: false });

  return <>
    <PageHero eyebrow="Teacher dashboard" title={profile.display_name ? `Welcome, ${profile.display_name}` : "Your classes"} intro="Create classes, set work from the question bank and follow student progress." />
    <section className="section-tight teacher-dashboard"><Container className="stack-xl">
      {message.error ? <p className="form-message form-error">{message.error}</p> : null}
      {message.success ? <p className="form-message form-success">{message.success}</p> : null}
      <div className="teacher-layout">
        <div className="stack-lg">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Your classes</p><h2>Classes and assignments</h2></div></div>
          <div className="teacher-class-grid">
            {(classes ?? []).map((item) => {
              const students = Array.isArray(item.class_memberships) ? item.class_memberships[0]?.count ?? 0 : 0;
              const assignments = Array.isArray(item.assignments) ? item.assignments[0]?.count ?? 0 : 0;
              return <Link className="teacher-class-card" href={`/teacher/classes/${item.id}`} key={item.id}>
                <span className="badge">{item.course}</span><h3>{item.name}</h3>
                <div className="teacher-card-stats"><span><strong>{students}</strong> students</span><span><strong>{assignments}</strong> assignments</span></div>
                <small>Class code {item.join_code}</small><span className="text-link">Open class</span>
              </Link>;
            })}
            {!classes?.length ? <div className="account-card stack"><h3>Create your first class</h3><p className="muted">Your class will receive a code that students can use to join.</p></div> : null}
          </div>
        </div>
        <aside className="account-card stack"><div><p className="eyebrow">New class</p><h3>Create a class</h3></div>
          <form action={createClass} className="stack">
            <label className="field"><span>Class name</span><input name="name" placeholder="Year 12 AA HL" maxLength={100} required /></label>
            <label className="field"><span>Course</span><select name="course" required><option value="AA HL">IB Mathematics AA HL</option><option value="AA SL">IB Mathematics AA SL</option><option value="AI HL">IB Mathematics AI HL</option><option value="AI SL">IB Mathematics AI SL</option><option value="IGCSE Higher">Edexcel IGCSE Mathematics</option></select></label>
            <button className="button" type="submit">Create class</button>
          </form>
        </aside>
      </div>
    </Container></section>
  </>;
}
