"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";
import { getCourseProduct } from "@/lib/platform-products";

export async function requestTeachableTransfer(formData: FormData) {
  const course = getCourseProduct(String(formData.get("courseId") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const accessPath = course?.curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const { supabase, user } = await requireSignedIn(accessPath, course?.curriculum);
  if (!course || !user.email) redirect(`${accessPath}?claim=error`);
  const { error } = await supabase.from("course_access_claims").insert({ user_id: user.id, curriculum: course.curriculum, product_code: course.productCode, email: user.email, note, status: "pending" });
  revalidatePath(accessPath);
  redirect(`${accessPath}?claim=${error?.code === "23505" ? "already-pending" : error ? "error" : "sent"}`);
}
