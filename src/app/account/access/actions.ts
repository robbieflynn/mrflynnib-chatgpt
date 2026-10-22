"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";
import { getCourseProduct } from "@/lib/platform-products";

export async function requestTeachableTransfer(formData: FormData) {
  const course = getCourseProduct(String(formData.get("courseId") || ""));
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const { supabase, user } = await requireSignedIn("/account/access", course?.curriculum);
  if (!course || !user.email) redirect("/account/access?claim=error");
  const { error } = await supabase.from("course_access_claims").insert({ user_id: user.id, curriculum: course.curriculum, product_code: course.productCode, email: user.email, note, status: "pending" });
  revalidatePath("/account/access");
  redirect(`/account/access?qualification=${course.curriculum}&claim=${error?.code === "23505" ? "already-pending" : error ? "error" : "sent"}`);
}
