"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";
import { sendTeacherApplicationEmail } from "@/lib/teacher-application-email";

export async function requestTeacherAccess() {
  const { supabase, user } = await requireSignedIn("/account");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,curriculum,role,teacher_status")
    .eq("user_id", user.id)
    .maybeSingle();
  const accountPath = profile?.curriculum === "igcse" ? "/igcse/account" : "/account";

  if (profile?.role === "teacher" || profile?.role === "admin") {
    redirect(profile.curriculum === "igcse" ? "/igcse/teacher" : "/teacher");
  }
  if (profile?.teacher_status === "pending") redirect(`${accountPath}?teacher=requested`);

  const { data: status, error } = await supabase.rpc("request_teacher_access");
  if (error || status !== "pending") {
    redirect(`${accountPath}?error=${encodeURIComponent("Your teacher access request could not be sent. Please try again.")}`);
  }

  if (user.email) {
    const sent = await sendTeacherApplicationEmail({ name: profile?.display_name || "", email: user.email });
    if (sent) await supabase.rpc("mark_teacher_notification_sent");
  }

  revalidatePath("/account");
  revalidatePath("/igcse/account");
  revalidatePath("/teacher");
  revalidatePath("/teacher/accounts");
  redirect(`${accountPath}?teacher=requested`);
}

export async function joinClass(formData: FormData) {
  const { supabase } = await requireSignedIn();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const requestedReturnPath = String(formData.get("returnPath") || "");
  const returnPath = /^\/join\/[A-Z0-9]{6,10}$/.test(requestedReturnPath) ? requestedReturnPath : "/account";
  const errorPath = (message: string) => `${returnPath}?error=${encodeURIComponent(message)}`;
  if (!code) redirect(errorPath("Enter your class code."));
  const { data: classId, error } = await supabase.rpc("join_class_by_code", { raw_code: code });
  if (error) redirect(errorPath(error.message || "That class code could not be used."));
  const { data: classRecord } = classId
    ? await supabase.from("classes").select("name,bank").eq("id", classId).maybeSingle()
    : { data: null };
  revalidatePath("/account");
  const className = classRecord?.name || "the class";
  const dashboardPath = classRecord?.bank === "igcse" ? "/igcse/account" : "/account";
  redirect(`${dashboardPath}?success=${encodeURIComponent(`You have joined ${className}.`)}`);
}

export async function submitAssignment(formData: FormData) {
  const { supabase } = await requireSignedIn();
  const assignmentId = String(formData.get("assignmentId") || "");
  const assignmentPath = `/assignments/${assignmentId}`;
  const { error } = await supabase.rpc("finalize_assignment_submission", { assignment_uuid: assignmentId });
  if (error) redirect(`${assignmentPath}?error=${encodeURIComponent("Your assignment could not be submitted.")}`);
  revalidatePath(assignmentPath);
  revalidatePath("/account");
  redirect(`${assignmentPath}?success=${encodeURIComponent("Assignment submitted.")}`);
}
