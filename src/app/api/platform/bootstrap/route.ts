import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { productsForCurriculum } from "@/lib/platform-products";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: progress } = await session.supabase.from("course_lesson_progress").select("course_id,lesson_id,completed,last_viewed_at").eq("user_id", session.user.id).eq("curriculum", session.curriculum);
  const { data: courseState } = await session.supabase.from("course_platform_state").select("last_course_id,last_lesson_id").eq("user_id", session.user.id).eq("curriculum", session.curriculum).maybeSingle();
  const products = productsForCurriculum(session.curriculum);
  const displayName = session.profile?.display_name || session.user.user_metadata.display_name || session.user.email?.split("@")[0] || "Student";
  return NextResponse.json({
    user: { displayName, email: session.user.email || "", initials: String(displayName).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: session.profile?.role || "student" },
    curriculum: session.curriculum,
    access: session.access,
    availableCourseIds: products.map((product) => product.id),
    ownedCourseIds: session.ownedCourses.map((product) => product.id),
    progress: progress || [],
    state: courseState || null,
    links: {
      account: session.curriculum === "igcse" ? "/igcse/account" : "/account",
      questionBank: session.curriculum === "igcse" ? "/igcse/question-bank" : "/question-bank",
      assignments: session.curriculum === "igcse" ? "/igcse/account#assignments" : "/account#assignments",
      access: `/account/access?qualification=${session.curriculum}`,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
