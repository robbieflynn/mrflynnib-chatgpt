import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendTeacherApplicationEmail } from "@/lib/teacher-application-email";

export type Curriculum = "ib" | "igcse";

function accountPath(curriculum: Curriculum) {
  return curriculum === "igcse" ? "/igcse/account" : "/account";
}

export async function requireSignedIn(nextPath = "/teacher", curriculum?: Curriculum) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${accountPath(curriculum || (nextPath.startsWith("/igcse") ? "igcse" : "ib"))}?next=${encodeURIComponent(nextPath)}`);
  const { data: accountProfile } = await supabase.from("profiles").select("role,display_name,curriculum,teacher_status,teacher_notification_sent_at").eq("user_id", user.id).maybeSingle();
  return { supabase, user, profile: accountProfile };
}

export async function requireTeacher(nextPath = "/teacher", curriculum?: Curriculum) {
  const { supabase, user, profile } = await requireSignedIn(nextPath, curriculum);
  if (profile?.role === "teacher" || profile?.role === "admin") return { supabase, user, profile };

  const activeCurriculum = curriculum || (nextPath.startsWith("/igcse") ? "igcse" : "ib");
  const destination = accountPath(activeCurriculum);
  const { data: status, error } = await supabase.rpc("request_teacher_access");

  if (error) redirect(`${destination}?teacher=access-required&error=${encodeURIComponent("Your teacher request could not be saved. Please try again.")}`);
  if (status === "pending") {
    if (!profile?.teacher_notification_sent_at && user.email) {
      const sent = await sendTeacherApplicationEmail({ name: profile?.display_name || "", email: user.email });
      if (sent) await supabase.rpc("mark_teacher_notification_sent");
    }
    redirect(`${destination}?teacher=requested`);
  }

  const { data: approvedProfile } = await supabase.from("profiles").select("role,display_name,curriculum,teacher_status,teacher_notification_sent_at").eq("user_id", user.id).maybeSingle();
  if (approvedProfile?.role !== "teacher" && approvedProfile?.role !== "admin") {
    redirect(`${destination}?teacher=access-required&error=${encodeURIComponent("Your teacher account could not be opened. Please try again.")}`);
  }
  return { supabase, user, profile: approvedProfile };
}

export async function requireAdmin() {
  const access = await requireTeacher();
  if (access.profile.role !== "admin") redirect("/teacher");
  return access;
}
