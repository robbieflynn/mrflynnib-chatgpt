import type { getPlatformAccess } from "@/lib/platform-server";

export type PlusTrial = { product_code: string; starts_at: string; expires_at: string };
export type TrialState = { trial: PlusTrial | null; available: boolean; active?: boolean };

export async function getTrialState(session: Awaited<ReturnType<typeof getPlatformAccess>>): Promise<TrialState> {
  if (!session.user || session.curriculum !== "ib") return { trial: null, available: false };
  if (session.ownedCourses.length && session.entitlements.some((item) => item.external_provider !== "plus_trial" && (item.product_code.startsWith("course_ib_") || ["teacher_plus_ib", "student_all_courses_ib"].includes(item.product_code)))) return { trial: null, available: false };
  const { data, error } = await session.supabase.from("platform_trials").select("product_code,starts_at,expires_at").eq("user_id", session.user.id).maybeSingle();
  // Missing migration or a failed lookup must never look like a new trial.
  return { trial: data as PlusTrial | null, active: Boolean(data && Date.parse(data.expires_at) > Date.now() && session.entitlements.some((item) => item.external_provider === "plus_trial" && item.product_code === data.product_code)), available: !error && !data && !session.ownedCourses.length && session.profile?.role !== "admin" };
}
