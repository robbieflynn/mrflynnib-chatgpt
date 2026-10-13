import type { Metadata } from "next";
import { Breadcrumbs, Container } from "@/components/ui";
import { TestMaker } from "@/components/test-maker";
import { requireTeacher } from "@/lib/account-access";
import { savedTestRecordFromRow } from "@/lib/saved-test";

export const metadata: Metadata = { title: "IB Test Maker", robots: { index: false, follow: false } };

export default async function TeacherTestMakerPage() {
  const { supabase, user } = await requireTeacher("/teacher/test-maker", "ib");
  const { data: savedRows } = await supabase
    .from("saved_tests")
    .select("id,title,course,paper,question_count,total_marks,payload,created_at,updated_at")
    .eq("teacher_id", user.id)
    .order("updated_at", { ascending: false });
  const savedTests = (savedRows ?? []).map((row) => savedTestRecordFromRow(row as Record<string, unknown>));
  return <main className="teacher-workspace test-maker-workspace">
    <section className="teacher-workspace-hero"><Container className="stack-lg">
      <Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: "IB Test Maker" }]} />
      <div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">IB teacher tools</p><h1>IB Test Maker</h1><p>Create, save and reuse polished, print-ready IB-style practice papers.</p></div><span className="teacher-workspace-icon" aria-hidden="true">T</span></div>
    </Container></section>
    <section className="section-tight"><Container><TestMaker initialSavedTests={savedTests} /></Container></section>
  </main>;
}
