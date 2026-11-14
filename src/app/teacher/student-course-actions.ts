"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/account-access";
import { getCourseProduct } from "@/lib/platform-products";

export async function changeStudentCourse(_previous: { error: string }, formData: FormData) {
  const { supabase } = await requireAdmin();
  const accountId = String(formData.get("accountId") || "");
  const expectedCourse = String(formData.get("expectedCourse") || "");
  const course = getCourseProduct(String(formData.get("courseId") || ""));
  if (!/^[0-9a-f-]{36}$/i.test(accountId) || !course || course.curriculum !== "ib") {
    return { error: "Choose a valid IB course." };
  }
  const { error } = await supabase.rpc("admin_change_student_course", {
    student_id: accountId, new_course: course.id, expected_course: expectedCourse,
  });
  if (error) {
    const messages: Record<string, string> = {
      course_changed: "This student's course changed since you opened the page. Reload before trying again.",
      school_seat: "This course is allocated through a school licence. Update the school seat allocation before changing it here.",
      ambiguous_course: "This account has several courses but no selected course. Select its main course in the student account first.",
      invalid_student: "Only IB student accounts can be changed here.",
    };
    return { error: messages[error.message] || "The course could not be changed. No changes were saved. Please try again." };
  }
  for (const path of ["/teacher/students", "/account", "/account/access", "/account/settings", `/teacher/students/${accountId}/course`]) revalidatePath(path);
  redirect(`/teacher/students?success=${encodeURIComponent(`Course changed to ${course.shortTitle}. Existing work and access expiry dates have been kept.`)}`);
}
