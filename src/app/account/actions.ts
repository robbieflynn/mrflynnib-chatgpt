"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";

export async function joinClass(formData: FormData) {
  const { supabase } = await requireSignedIn();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) redirect("/account?error=Enter%20your%20class%20code.");
  const { error } = await supabase.rpc("join_class_by_code", { raw_code: code });
  if (error) redirect(`/account?error=${encodeURIComponent(error.message || "That class code could not be used.")}`);
  revalidatePath("/account");
  redirect("/account?success=You%20have%20joined%20the%20class.");
}

export async function submitAssignment(formData: FormData) {
  const { supabase, user } = await requireSignedIn();
  const assignmentId = String(formData.get("assignmentId") || "");
  const { error } = await supabase.from("assignment_submissions").upsert({
    assignment_id: assignmentId,
    student_id: user.id,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "assignment_id,student_id" });
  if (error) redirect(`/assignments/${assignmentId}?error=${encodeURIComponent("Your assignment could not be submitted.")}`);
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/account");
  redirect(`/assignments/${assignmentId}?success=${encodeURIComponent("Assignment submitted.")}`);
}
