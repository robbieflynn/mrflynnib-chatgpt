import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct } from "@/lib/platform-products";

export async function POST(request: Request) {
  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const course = getCourseProduct(typeof body.courseId === "string" ? body.courseId : "");
  const lessonId = typeof body.lessonId === "string" ? body.lessonId.slice(0, 100) : "";
  if (!course || course.curriculum !== session.curriculum || !lessonId) return NextResponse.json({ error: "Invalid lesson" }, { status: 400 });
  if (!session.ownedCourses.some((item) => item.id === course.id)) return NextResponse.json({ error: "Full course access required" }, { status: 403 });
  const completed = Boolean(body.completed);
  const now = new Date().toISOString();
  const { error } = await session.supabase.from("course_lesson_progress").upsert({ user_id: session.user.id, curriculum: session.curriculum, course_id: course.id, lesson_id: lessonId, completed, completed_at: completed ? now : null, last_viewed_at: now, updated_at: now }, { onConflict: "user_id,curriculum,course_id,lesson_id" });
  if (error) return NextResponse.json({ error: "Progress could not be saved" }, { status: 503 });
  await session.supabase.from("course_platform_state").upsert({ user_id: session.user.id, curriculum: session.curriculum, last_course_id: course.id, last_lesson_id: lessonId, updated_at: now }, { onConflict: "user_id,curriculum" });
  return NextResponse.json({ ok: true, completed });
}
