import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { productsForCurriculum } from "@/lib/platform-products";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const requestedCurriculum = new URL(request.url).searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const isAdmin = session.profile?.role === "admin";
  if (!isAdmin && requestedCurriculum !== session.curriculum) {
    return NextResponse.json({ error: "This account belongs to the other curriculum area", code: "curriculum_mismatch", currentCurriculum: session.curriculum }, { status: 409 });
  }
  const curriculum = isAdmin ? requestedCurriculum : session.curriculum;
  const { data: progress } = await session.supabase.from("course_lesson_progress").select("course_id,lesson_id,completed,last_viewed_at").eq("user_id", session.user.id).eq("curriculum", curriculum);
  const { data: courseState } = await session.supabase.from("course_platform_state").select("last_course_id,last_lesson_id").eq("user_id", session.user.id).eq("curriculum", curriculum).maybeSingle();
  const products = productsForCurriculum(curriculum);
  const preferredCourseId = typeof session.user.user_metadata.primary_course === "string" ? session.user.user_metadata.primary_course : null;
  const role = session.profile?.role || "student";
  const availableCourseIds = role === "teacher" || role === "admin"
    ? products.map((product) => product.id)
    : Array.from(new Set([
      ...(preferredCourseId && products.some((product) => product.id === preferredCourseId) ? [preferredCourseId] : []),
      ...(isAdmin ? products.map((product) => product.id) : session.ownedCourses.map((product) => product.id)),
    ]));
  const displayName = session.profile?.display_name || session.user.user_metadata.display_name || session.user.email?.split("@")[0] || "Student";
  return NextResponse.json({
    user: { displayName, email: session.user.email || "", initials: String(displayName).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: session.profile?.role || "student" },
    curriculum,
    access: session.access,
    availableCourseIds,
    ownedCourseIds: (isAdmin ? products : session.ownedCourses).filter((product) => product.curriculum === curriculum).map((product) => product.id),
    preferredCourseId,
    progress: progress || [],
    state: courseState || null,
    links: {
      account: curriculum === "igcse" ? "/igcse/account" : "/account",
      questionBank: curriculum === "igcse" ? "/igcse/question-bank" : "/question-bank",
      assignments: curriculum === "igcse" ? "/igcse/account#assignments" : "/account#assignments",
      access: curriculum === "igcse" ? "/igcse/account/access" : "/account/access",
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
