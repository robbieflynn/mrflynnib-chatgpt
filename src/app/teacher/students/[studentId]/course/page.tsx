import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/account-access";
import { getCourseProduct, courseProductForCode } from "@/lib/platform-products";
import { AdminCourseForm } from "@/components/admin-course-form";
import { Breadcrumbs, Container } from "@/components/ui";

export const metadata = { title: "Change student course", robots: { index: false, follow: false } };

export default async function StudentCoursePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { supabase } = await requireAdmin();
  const { studentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) notFound();
  const { data, error } = await supabase.rpc("admin_student_course_details", { student_id: studentId });
  if (error) return <section className="section-tight"><Container><p role="alert" className="form-message form-error">Student course details could not be loaded. Please try again or check that course administration has been enabled.</p><Link href="/teacher/students">Back to student accounts</Link></Container></section>;
  if (!data) notFound();
  const details = data as { display_name: string; email: string; primary_course: string; access: { product_code: string; expires_at: string | null }[] };
  const selected = getCourseProduct(details.primary_course);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const courses = [...new Set((details.access || []).filter((record) => !record.expires_at || Date.parse(record.expires_at) > now)
    .map((record) => courseProductForCode(record.product_code)).filter((course) => course?.curriculum === "ib").map((course) => course!.id))];
  const currentCourse = courses.length === 1 ? courses[0] : selected?.curriculum === "ib" ? selected.id : "";
  const name = details.display_name || details.email || "Student";
  return <section className="section-tight"><Container className="stack-xl">
    <Breadcrumbs items={[{ label: "Administration", href: "/teacher/administration" }, { label: "Student accounts", href: "/teacher/students" }, { label: "Change course" }]} />
    <div className="dashboard-section-heading"><div><h1>Change student course</h1><p>{name} · {details.email}</p></div></div>
    <div className="card stack">
      <p><strong>Selected course:</strong> {selected?.shortTitle || "Not selected"}</p>
      <p><strong>Plus course access:</strong> {courses.map((id) => getCourseProduct(id)?.shortTitle).join(", ") || "None"}</p>
      {selected && courses.length === 1 && selected.id !== courses[0] ? <p className="form-message">The selected course and Plus access differ. Saving below moves the Plus access shown here to the new course, keeping its expiry.</p> : null}
      <p><strong>Course being changed:</strong> {getCourseProduct(currentCourse)?.shortTitle || "Not selected"}</p>
      {!currentCourse && courses.length > 1 ? <p className="form-message form-error">This account has several courses but no selected course. Select its main course in the student account first.</p> : <AdminCourseForm accountId={studentId} currentCourse={currentCourse} name={name} />}
    </div>
    <Link className="text-link" href="/teacher/students">Back to student accounts</Link>
  </Container></section>;
}
