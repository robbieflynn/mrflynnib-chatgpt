import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const automaticTeacherDomains = new Set([
  "jess.sch.ae",
  "beausoleil.ch",
  "westminsteracademy.org.uk",
]);

function emailDomain(email: string) {
  return email.trim().toLowerCase().split("@").at(-1) || "";
}

export function isAutomaticPartnerSchoolTeacher(user: User) {
  return Boolean(
    user.email
    && user.email_confirmed_at
    && user.user_metadata?.account_type === "teacher"
    && automaticTeacherDomains.has(emailDomain(user.email)),
  );
}

export async function ensurePartnerSchoolTeacherRole(user: User) {
  if (!isAutomaticPartnerSchoolTeacher(user)) return false;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin.from("profiles")
    .update({
      role: "teacher",
      teacher_status: "approved",
      teacher_requested_at: now,
      teacher_notification_sent_at: now,
      updated_at: now,
    })
    .eq("user_id", user.id)
    .neq("role", "admin")
    .select("user_id")
    .maybeSingle();

  return !error && Boolean(data);
}
