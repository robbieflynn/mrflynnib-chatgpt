"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSignedIn } from "@/lib/account-access";
import { courseProductForCode, getCourseProduct } from "@/lib/platform-products";

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

export async function redeemAccessCode(formData: FormData) {
  const curriculum = formData.get("curriculum") === "igcse" ? "igcse" : "ib";
  const accessPath = curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const { supabase } = await requireSignedIn(accessPath, curriculum);
  const code = String(formData.get("accessCode") || "").trim();
  const selectedCourse = getCourseProduct(String(formData.get("courseId") || ""));
  const requestedProductCode = selectedCourse?.curriculum === curriculum ? selectedCourse.productCode : null;
  const destination = (status: string, productCode?: string) => {
    const params = new URLSearchParams({ code: status });
    const course = productCode ? courseProductForCode(productCode) ?? selectedCourse : selectedCourse;
    if (course?.curriculum === curriculum) params.set("course", course.id);
    return `${accessPath}?${params.toString()}`;
  };
  if (!code) redirect(destination("invalid"));
  const { data, error } = await supabase.rpc("redeem_platform_access_code_for_product", {
    raw_code: code,
    requested_product_code: requestedProductCode,
    required_code_product: null,
  });
  const result = data && typeof data === "object" ? data as { status?: string; product_code?: string } : null;
  if (error) redirect(destination("error"));
  const status = result?.status || "error";
  if (status === "redeemed") {
    revalidatePath(accessPath);
    revalidatePath(curriculum === "igcse" ? "/igcse/account" : "/account");
  }
  redirect(destination(status, result?.product_code));
}
