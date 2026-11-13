import type { Metadata } from "next";
import { TeacherAccessView } from "@/components/platform/teacher-access-view";
import { requireTeacher } from "@/lib/account-access";
import { activePlatformEntitlements, type PlatformEntitlement } from "@/lib/platform-access";
import { teacherPlusProduct } from "@/lib/platform-products";

export const metadata: Metadata = { title: "Teacher Plus", robots: { index: false, follow: false } };

export default async function TeacherAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, user } = await requireTeacher("/teacher/access", "ib");
  const query = await searchParams;
  const { data } = await supabase
    .from("platform_entitlements")
    .select("product_code,status,starts_at,expires_at")
    .eq("user_id", user.id)
    .eq("product_code", teacherPlusProduct.productCode);
  const active = activePlatformEntitlements(data as PlatformEntitlement[] | null)[0];
  return <TeacherAccessView active={active} query={query} />;
}
