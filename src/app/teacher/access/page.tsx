import type { Metadata } from "next";
import { TeacherAccessView } from "@/components/platform/teacher-access-view";
import { requireTeacher } from "@/lib/account-access";
import { getPlatformAccess } from "@/lib/platform-server";
import { getTrialState } from "@/lib/platform-trials";
import { teacherPlusProduct } from "@/lib/platform-products";

export const metadata: Metadata = { title: "Teacher Plus", robots: { index: false, follow: false } };

export default async function TeacherAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireTeacher("/teacher/access", "ib");
  const session = await getPlatformAccess("ib");
  const active = session.entitlements.filter((item) => item.product_code === teacherPlusProduct.productCode)
    .sort((a, b) => Number(a.external_provider === "plus_trial") - Number(b.external_provider === "plus_trial"))[0];
  return <TeacherAccessView active={active} query={await searchParams} trialState={await getTrialState(session)} />;
}
