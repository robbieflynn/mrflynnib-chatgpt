import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireSignedIn(nextPath = "/teacher") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/account?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}

export async function requireTeacher(nextPath = "/teacher") {
  const { supabase, user } = await requireSignedIn(nextPath);
  const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "teacher" && profile?.role !== "admin") redirect("/account?teacher=approval-required");
  return { supabase, user, profile };
}

export async function requireAdmin() {
  const access = await requireTeacher();
  if (access.profile.role !== "admin") redirect("/teacher");
  return access;
}
