import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const automaticTeacherDomains = new Set([
  "jess.sch.ae",
  "beausoleil.ch",
  "westminsteracademy.org.uk",
]);

type TeacherIntentProfile = {
  role: string | null;
  teacher_status: string | null;
  teacher_requested_at: string | null;
};

function emailDomain(email: string) {
  return email.trim().toLowerCase().split("@").at(-1) || "";
}

export function isAutomaticPartnerSchoolTeacher(
  user: User,
  profile?: TeacherIntentProfile | null,
) {
  const teacherWasRequested = profile?.teacher_status === "pending"
    || profile?.teacher_status === "approved"
    || Boolean(profile?.teacher_requested_at);

  return Boolean(
    user.email
    && user.email_confirmed_at
    && (user.user_metadata?.account_type === "teacher" || teacherWasRequested)
    && automaticTeacherDomains.has(emailDomain(user.email)),
  );
}

export async function ensurePartnerSchoolTeacherRole(user: User) {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role,teacher_status,teacher_requested_at")
    .eq("user_id", user.id)
    .maybeSingle<TeacherIntentProfile>();

  if (profileError || !profile || profile.role === "admin") return false;
  if (!isAutomaticPartnerSchoolTeacher(user, profile)) return false;

  const now = new Date().toISOString();
  if (user.user_metadata?.account_type !== "teacher") {
    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, account_type: "teacher" },
    });
    if (metadataError) return false;
  }

  const { data, error } = await admin.from("profiles")
    .update({
      role: "teacher",
      teacher_status: "approved",
      teacher_requested_at: now,
      teacher_notification_sent_at: now,
      updated_at: now,
    })
    .eq("user_id", user.id)
    .select("user_id")
    .maybeSingle();

  return !error && Boolean(data);
}
