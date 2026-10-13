import type { Metadata } from "next";
import { Breadcrumbs, Container } from "@/components/ui";
import { TestMaker } from "@/components/test-maker";
import { requireTeacher } from "@/lib/account-access";

export const metadata: Metadata = { title: "Teacher test maker", robots: { index: false, follow: false } };

export default async function TeacherTestMakerPage() {
  await requireTeacher("/teacher/test-maker", "ib");
  return <main className="teacher-workspace test-maker-workspace">
    <section className="teacher-workspace-hero"><Container className="stack-lg">
      <Breadcrumbs items={[{ label: "Teacher dashboard", href: "/teacher" }, { label: "Test maker" }]} />
      <div className="teacher-workspace-title"><div className="stack-sm"><p className="dashboard-role-label">IB teacher tools</p><h1>Build a test</h1><p>Select questions from the bank and turn them into a polished, print-ready IB-style practice paper.</p></div><span className="teacher-workspace-icon" aria-hidden="true">T</span></div>
    </Container></section>
    <section className="section-tight"><Container><TestMaker /></Container></section>
  </main>;
}
