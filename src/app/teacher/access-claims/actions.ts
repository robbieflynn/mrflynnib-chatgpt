"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/account-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reviewAccessClaim(formData: FormData) {
  const { user } = await requireAdmin();
  const claimId = String(formData.get("claimId") || "");
  const decision = formData.get("decision") === "approved" ? "approved" : "declined";
  const admin = createAdminClient();
  const { data: claim } = await admin.from("course_access_claims").select("id,user_id,product_code,status").eq("id", claimId).maybeSingle();
  if (!claim || claim.status !== "pending") return;
  if (decision === "approved") await admin.from("platform_entitlements").insert({ user_id: claim.user_id, product_code: claim.product_code, status: "active", source: "teachable", starts_at: new Date().toISOString(), expires_at: null, external_provider: "teachable-transfer", external_reference: claim.id, metadata: { verified_by: user.id } });
  await admin.from("course_access_claims").update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", claim.id);
  revalidatePath("/teacher/access-claims");
}
