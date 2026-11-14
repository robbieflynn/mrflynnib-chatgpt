import { notFound } from "next/navigation";
import Link from "next/link";
import { CourseAccessView } from "@/components/platform/course-access-page";
import { TeacherAccessView } from "@/components/platform/teacher-access-view";
import { platformAccessSummary } from "@/lib/platform-access";

export const metadata = { title: "Pricing preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PricingReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const query = await searchParams;
  const teacher = query.role === "teacher";
  const single = query.single === "1";
  const trialState = { trial: null, available: true };
  return <><div className="platform-review-bar"><div className="container"><strong>Pricing preview · example account</strong><p><Link href="/pricing-review?course=aa-hl">Student</Link> · <Link href="/pricing-review?role=teacher">Teacher Plus</Link> · <Link href="/pricing-review?role=teacher&single=1&course=aa-hl">Teacher single course</Link></p></div></div>{teacher && !single ? <TeacherAccessView query={query} trialState={trialState} /> : <CourseAccessView curriculum="ib" query={query} trialState={trialState} session={{ profile: { display_name: "Preview", curriculum: "ib", role: teacher ? "teacher" : "student", teacher_status: teacher ? "approved" : null }, access: platformAccessSummary([], [], new Date(), "ib"), ownedCourses: [] }} />}</>;
}
