import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct } from "@/lib/platform-products";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const course = getCourseProduct(typeof body.courseId === "string" ? body.courseId : "");
  if (!course) return NextResponse.json({ error: "Invalid course" }, { status: 400 });

  const session = await getPlatformAccess(course.curriculum);
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const isTeacher = session.profile?.role === "teacher" || session.profile?.role === "admin";
  const preferredCourse = session.user.user_metadata.primary_course;
  const canUseCourse = isTeacher
    || session.ownedCourses.some((item) => item.id === course.id)
    || preferredCourse === course.id;
  if (!canUseCourse) return NextResponse.json({ error: "Course access required" }, { status: 403 });

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.slice(0, 100) : null;
  const now = new Date().toISOString();
  const { error } = await session.supabase.from("course_platform_state").upsert({
    user_id: session.user.id,
    curriculum: session.curriculum,
    last_course_id: course.id,
    last_lesson_id: lessonId,
    updated_at: now,
  }, { onConflict: "user_id,curriculum" });

  if (error) return NextResponse.json({ error: "Course choice could not be saved" }, { status: 503 });
  return NextResponse.json({ ok: true, courseId: course.id });
}
