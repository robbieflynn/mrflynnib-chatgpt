"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/account-access";

const teacherAccessPath = "/teacher/access";

export async function redeemTeacherAccessCode(formData: FormData) {
  const { supabase } = await requireTeacher(teacherAccessPath, "ib");
  const code = String(formData.get("accessCode") || "").trim();
  if (!code) redirect(`${teacherAccessPath}?code=invalid`);

  const { data, error } = await supabase.rpc("redeem_platform_access_code_for_product", {
    raw_code: code,
    requested_product_code: null,
    required_code_product: "teacher_plus_ib",
  });
  const result = data && typeof data === "object" ? data as { status?: string } : null;
  if (error) redirect(`${teacherAccessPath}?code=error`);

  const status = result?.status || "error";
  if (status === "redeemed") {
    revalidatePath(teacherAccessPath);
    revalidatePath("/teacher");
    revalidatePath("/learn");
  }
  redirect(`${teacherAccessPath}?code=${encodeURIComponent(status)}`);
}
