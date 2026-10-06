import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireSignedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account?next=/teacher");
  return { supabase, user };
}

export async function requireTeacher() {
  const { supabase, user } = await requireSignedIn();
  const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "teacher") redirect("/account?teacher=approval-required");
  return { supabase, user, profile };
}
