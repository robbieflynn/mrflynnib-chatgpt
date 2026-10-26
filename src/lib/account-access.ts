import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Curriculum = "ib" | "igcse";

function accountPath(curriculum: Curriculum) {
  return curriculum === "igcse" ? "/igcse/account" : "/account";
}

export async function requireSignedIn(nextPath = "/teacher", curriculum?: Curriculum) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`${accountPath(curriculum || (nextPath.startsWith("/igcse") ? "igcse" : "ib"))}?next=${encodeURIComponent(nextPath)}`);
  const { data: accountProfile } = await supabase.from("profiles").select("role,display_name,curriculum").eq("user_id", user.id).maybeSingle();
  return { supabase, user, profile: accountProfile };
}

export async function requireTeacher(nextPath = "/teacher", curriculum?: Curriculum) {
  const { supabase, user, profile } = await requireSignedIn(nextPath, curriculum);
  if (profile?.role !== "teacher" && profile?.role !== "admin") redirect(`${accountPath(curriculum || (nextPath.startsWith("/igcse") ? "igcse" : "ib"))}?teacher=access-required`);
  return { supabase, user, profile };
}

export async function requireAdmin() {
  const access = await requireTeacher();
  if (access.profile.role !== "admin") redirect("/teacher");
  return access;
}
