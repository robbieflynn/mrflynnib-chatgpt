import { createClient } from "@/lib/supabase/server";
import { activePlatformEntitlements, platformAccessSummary, type PlatformEntitlement, type PlatformLicenseSeat } from "@/lib/platform-access";
import { courseProductForCode, productsForCurriculum, type CourseProduct } from "@/lib/platform-products";

export async function getPlatformSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, curriculum: null };
  const { data: profile } = await supabase.from("profiles").select("display_name,role,curriculum").eq("user_id", user.id).maybeSingle();
  const curriculum = profile?.curriculum === "igcse" ? "igcse" : "ib";
  return { supabase, user, profile, curriculum } as const;
}

export async function getPlatformAccess() {
  const session = await getPlatformSession();
  if (!session.user || !session.curriculum) return { ...session, access: null, ownedCourses: [] as CourseProduct[], entitlements: [] as PlatformEntitlement[] };
  // Best effort: a confirmed account whose email matches a verified Teachable
  // migration record receives the exact course and expiry already audited.
  await session.supabase.rpc("claim_verified_course_access");
  const [personalResult, schoolResult] = await Promise.all([
    session.supabase.from("platform_entitlements").select("product_code,status,starts_at,expires_at").eq("user_id", session.user.id),
    session.supabase.from("organization_license_seats").select("revoked_at,organization_licenses(product_code,status,starts_at,ends_at)").eq("user_id", session.user.id).is("revoked_at", null),
  ]);
  const personal = (personalResult.data || []) as PlatformEntitlement[];
  const seats = (schoolResult.data || []) as PlatformLicenseSeat[];
  const schoolEntitlements = seats.flatMap((seat) => {
    const licence = Array.isArray(seat.organization_licenses) ? seat.organization_licenses[0] : seat.organization_licenses;
    return licence && !seat.revoked_at ? [{ product_code: licence.product_code, status: licence.status === "pilot" ? "active" : licence.status, starts_at: licence.starts_at, expires_at: licence.ends_at }] : [];
  }) as PlatformEntitlement[];
  const entitlements = activePlatformEntitlements([...personal, ...schoolEntitlements]);
  const products = productsForCurriculum(session.curriculum);
  const entitledCourses = session.profile?.role === "admin"
    ? products
    : entitlements.map((item) => courseProductForCode(item.product_code)).filter((item): item is CourseProduct => Boolean(item && item.curriculum === session.curriculum));
  const ownedCourses = Array.from(new Map(entitledCourses.map((course) => [course.id, course])).values());
  return { ...session, access: platformAccessSummary(personal, seats), entitlements, ownedCourses };
}
