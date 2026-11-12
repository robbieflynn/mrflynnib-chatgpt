"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/account-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reviewAccessClaim(formData: FormData) {
  const { user } = await requireAdmin();
  const claimId = String(formData.get("claimId") || "");
  const decision = formData.get("decision") === "approved" ? "approved" : "declined";
  const admin = createAdminClient();
  const { data: claim } = await admin.from("course_access_claims").select("id,user_id,email,product_code,status").eq("id", claimId).maybeSingle();
  if (!claim || claim.status !== "pending") return;
  if (decision === "approved") {
    const { data: migration, error: migrationError } = await admin.from("course_access_migrations")
      .select("starts_at,expires_at,status").eq("normalized_email", claim.email.trim().toLowerCase()).eq("product_code", claim.product_code).maybeSingle();
    if (migrationError) redirect("/teacher/access-claims?error=save");
    const originalExpiry = String(formData.get("originalExpiry") || "").trim();
    const verifiedNoExpiry = formData.get("verifiedNoExpiry") === "on";
    const knownMigration = migration && ["verified", "claimed"].includes(migration.status);
    const expiresAt = knownMigration ? migration.expires_at : verifiedNoExpiry ? null : originalExpiry ? `${originalExpiry}Z` : undefined;
    if (expiresAt === undefined || (expiresAt !== null && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()))) redirect("/teacher/access-claims?error=expiry");
    const { error } = await admin.from("platform_entitlements").upsert({
      user_id: claim.user_id, product_code: claim.product_code, status: "active", source: "teachable",
      starts_at: knownMigration ? migration.starts_at : new Date().toISOString(), expires_at: expiresAt,
      external_provider: "teachable-transfer", external_reference: claim.id,
      metadata: { verified_by: user.id, expiry_evidence: knownMigration ? "verified_migration" : "administrator_verified_original_expiry" },
    }, { onConflict: "external_provider,external_reference", ignoreDuplicates: true });
    if (error) redirect("/teacher/access-claims?error=save");
  }
  const { error: reviewError } = await admin.from("course_access_claims").update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", claim.id);
  if (reviewError) redirect("/teacher/access-claims?error=save");
  revalidatePath("/teacher/access-claims");
}
