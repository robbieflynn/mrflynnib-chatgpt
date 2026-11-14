import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/account-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseProduct, courseProductForCode } from "@/lib/platform-products";
import { AdminCourseForm } from "@/components/admin-course-form";
import { Breadcrumbs, Container } from "@/components/ui";

export const metadata = { title: "Change student course", robots: { index: false, follow: false } };

export default async function StudentCoursePage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireAdmin();
  const { studentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) notFound();
  const admin = createAdminClient();
  const [profile, auth, access] = await Promise.all([
    admin.from("profiles").select("role,curriculum,display_name,email").eq("user_id", studentId).maybeSingle(),
    admin.auth.admin.getUserById(studentId),
    admin.from("platform_entitlements").select("product_code,status,expires_at").eq("user_id", studentId).eq("status", "active"),
  ]);
  if (profile.error || auth.error || access.error) throw new Error("Student details could not be loaded. Please retry.");
  if (!profile.data || !auth.data.user || profile.data.role !== "student" || profile.data.curriculum !== "ib") notFound();
  const selected = getCourseProduct(auth.data.user.user_metadata.primary_course);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const courses = [...new Set((access.data || []).filter((record) => !record.expires_at || Date.parse(record.expires_at) > now)
    .map((record) => courseProductForCode(record.product_code)).filter((course) => course?.curriculum === "ib").map((course) => course!.id))];
  const currentCourse = selected?.curriculum === "ib" ? selected.id : courses.length === 1 ? courses[0] : "";
  const name = profile.data.display_name || profile.data.email || "Student";
  return <section className="section-tight"><Container className="stack-xl">
    <Breadcrumbs items={[{ label: "Administration", href: "/teacher/administration" }, { label: "Student accounts", href: "/teacher/students" }, { label: "Change course" }]} />
    <div className="dashboard-section-heading"><div><h1>Change student course</h1><p>{name} · {profile.data.email}</p></div></div>
    <div className="card stack">
      <p><strong>Current course:</strong> {getCourseProduct(currentCourse)?.shortTitle || "Not selected"}</p>
      {!currentCourse && courses.length > 1 ? <p className="form-message form-error">This account has several courses but no selected course. Select its main course in the student account first.</p> : <AdminCourseForm accountId={studentId} currentCourse={currentCourse} name={name} />}
    </div>
    <Link className="text-link" href="/teacher/students">Back to student accounts</Link>
  </Container></section>;
}
