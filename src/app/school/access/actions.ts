"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assignSchoolSeat(formData: FormData) {
  const { supabase, user } = await requireSignedIn("/school/access");
  const licenseId = String(formData.get("licenseId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const { data: licence } = await supabase.from("organization_licenses").select("id,seat_limit,organization_id,organization_license_seats(user_id,revoked_at)").eq("id", licenseId).maybeSingle();
  if (!licence) return;
  const { data: membership } = await supabase.from("organization_memberships").select("role,status").eq("organization_id", licence.organization_id).eq("user_id", user.id).maybeSingle();
  if (membership?.role !== "billing_contact" || membership.status !== "active") return;
  const activeSeats = (licence.organization_license_seats || []).filter((seat: { revoked_at: string | null }) => !seat.revoked_at).length;
  if (licence.seat_limit && activeSeats >= licence.seat_limit) return;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("user_id").ilike("email", email).maybeSingle();
  if (!profile) return;
  await admin.from("organization_license_seats").upsert({ license_id: licenseId, user_id: profile.user_id, assigned_by: user.id, assigned_at: new Date().toISOString(), revoked_at: null }, { onConflict: "license_id,user_id" });
  revalidatePath("/school/access");
}

export async function revokeSchoolSeat(formData: FormData) {
  const { supabase, user } = await requireSignedIn("/school/access");
  const licenseId = String(formData.get("licenseId") || "");
  const studentId = String(formData.get("studentId") || "");
  const { data: licence } = await supabase.from("organization_licenses").select("organization_id").eq("id", licenseId).maybeSingle();
  if (!licence) return;
  const { data: membership } = await supabase.from("organization_memberships").select("role,status").eq("organization_id", licence.organization_id).eq("user_id", user.id).maybeSingle();
  if (membership?.role !== "billing_contact" || membership.status !== "active") return;
  await createAdminClient().from("organization_license_seats").update({ revoked_at: new Date().toISOString() }).eq("license_id", licenseId).eq("user_id", studentId);
  revalidatePath("/school/access");
}
