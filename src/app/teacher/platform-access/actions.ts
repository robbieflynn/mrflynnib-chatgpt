"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/account-access";
import { courseProducts, paidProductForCode, studentAllCoursesProduct, studentChooseOneCourseCodeProduct, teacherPlusProduct } from "@/lib/platform-products";
import { createAdminClient } from "@/lib/supabase/admin";

const adminProducts = [...courseProducts, studentChooseOneCourseCodeProduct, studentAllCoursesProduct, teacherPlusProduct];
const grantProducts = [...courseProducts, studentAllCoursesProduct, teacherPlusProduct];
const validAccessCodeProductCodes = new Set(adminProducts.map((product) => product.productCode));
const validGrantProductCodes = new Set(grantProducts.map((product) => product.productCode));
const adminPath = "/teacher/platform-access";

export type AccessCodeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  code?: string;
};

function normalizedAccessCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generatedAccessCode(productCode: string) {
  const product = paidProductForCode(productCode);
  const prefix = product?.shortTitle.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "PLUS";
  const token = randomBytes(6).toString("hex").toUpperCase();
  return `MFI-${prefix}-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8)}`;
}

function positiveInteger(value: FormDataEntryValue | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

function accessDaysFromForm(value: FormDataEntryValue | null, fallback: number) {
  if (value === "lifetime") return null;
  return positiveInteger(value, fallback, 3650);
}

export async function createAccessCode(_: AccessCodeActionState, formData: FormData): Promise<AccessCodeActionState> {
  const { user } = await requireAdmin();
  const productCode = String(formData.get("productCode") || "");
  if (!validAccessCodeProductCodes.has(productCode)) return { status: "error", message: "Choose a valid product." };

  const product = paidProductForCode(productCode);
  const defaultDays = productCode === teacherPlusProduct.productCode ? 365 : 730;
  const accessDays = accessDaysFromForm(formData.get("accessDays"), defaultDays);
  const maxRedemptions = positiveInteger(formData.get("maxRedemptions"), 1, 10000);
  const customCode = String(formData.get("customCode") || "").trim();
  const rawCode = customCode || generatedAccessCode(productCode);
  const normalizedCode = normalizedAccessCode(rawCode);
  if (normalizedCode.length < 8 || normalizedCode.length > 64) {
    return { status: "error", message: "Use a code containing 8 to 64 letters or numbers." };
  }

  const expiresOn = String(formData.get("expiresOn") || "").trim();
  const expiresAt = expiresOn ? new Date(`${expiresOn}T23:59:59.999Z`) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    return { status: "error", message: "The code expiry date must be in the future." };
  }

  const hint = normalizedCode.length <= 10
    ? `${normalizedCode.slice(0, 3)}…${normalizedCode.slice(-3)}`
    : `${normalizedCode.slice(0, 5)}…${normalizedCode.slice(-4)}`;
  const { error } = await createAdminClient().from("platform_access_codes").insert({
    code_hash: createHash("sha256").update(normalizedCode).digest("hex"),
    code_hint: hint,
    product_code: productCode,
    access_days: accessDays,
    max_redemptions: maxRedemptions,
    expires_at: expiresAt?.toISOString() || null,
    note: String(formData.get("note") || "").trim().slice(0, 500),
    created_by: user.id,
  });

  if (error?.code === "23505") return { status: "error", message: "That code already exists. Choose another one." };
  if (error) return { status: "error", message: "The access code could not be created." };
  revalidatePath(adminPath);
  return { status: "success", message: `${product?.shortTitle || "Course"} access code created. Copy it now; it will not be shown in full again.`, code: rawCode };
}

export async function grantCourseAccess(formData: FormData) {
  const { user } = await requireAdmin();
  const productCode = String(formData.get("productCode") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!validGrantProductCodes.has(productCode) || !email.includes("@")) redirect(`${adminPath}?error=invalid-grant`);

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("user_id,role").ilike("email", email).maybeSingle();
  if (!profile?.user_id) redirect(`${adminPath}?error=account-not-found`);
  if (productCode === teacherPlusProduct.productCode && !["teacher", "admin"].includes(profile.role)) {
    redirect(`${adminPath}?error=teacher-required`);
  }

  const { data: existing } = await admin.from("platform_entitlements")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("product_code", productCode)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (existing) redirect(`${adminPath}?success=already-active`);

  const defaultDays = productCode === teacherPlusProduct.productCode ? 365 : 730;
  const accessDays = accessDaysFromForm(formData.get("accessDays"), defaultDays);
  const now = new Date();
  const expiresAt = accessDays ? new Date(now.getTime() + accessDays * 86_400_000).toISOString() : null;
  const { error } = await admin.from("platform_entitlements").insert({
    user_id: profile.user_id,
    product_code: productCode,
    status: "active",
    source: "admin",
    starts_at: now.toISOString(),
    expires_at: expiresAt,
    external_provider: "manual-admin",
    external_reference: randomUUID(),
    metadata: { granted_by: user.id, note: String(formData.get("note") || "").trim().slice(0, 500) },
  });
  if (error) redirect(`${adminPath}?error=grant-failed`);
  revalidatePath(adminPath);
  redirect(`${adminPath}?success=access-granted`);
}

export async function setAccessCodeStatus(formData: FormData) {
  await requireAdmin();
  const codeId = String(formData.get("codeId") || "");
  const status = formData.get("status") === "active" ? "active" : "disabled";
  if (codeId) await createAdminClient().from("platform_access_codes").update({ status, updated_at: new Date().toISOString() }).eq("id", codeId);
  revalidatePath(adminPath);
}

export async function revokeCourseAccess(formData: FormData) {
  await requireAdmin();
  const entitlementId = String(formData.get("entitlementId") || "");
  if (entitlementId) await createAdminClient().from("platform_entitlements").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", entitlementId);
  revalidatePath(adminPath);
}

