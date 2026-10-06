"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import progressManifest from "@/data/question-bank-progress.json";
import { requireAdmin, requireTeacher } from "@/lib/account-access";

const validCourses = new Set(["AA HL", "AA SL", "AI HL", "AI SL", "IGCSE Higher"]);

function messagePath(path: string, key: "error" | "success", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

export async function createClass(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const course = String(formData.get("course") || "");
  if (!name || !validCourses.has(course)) redirect(messagePath("/teacher", "error", "Add a class name and choose a course."));

  let createdId = "";
  for (let attempt = 0; attempt < 5 && !createdId; attempt += 1) {
    const joinCode = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7).toUpperCase();
    const { data, error } = await supabase.from("classes").insert({
      teacher_id: user.id,
      name,
      bank: course === "IGCSE Higher" ? "igcse" : "ib",
      course,
      join_code: joinCode,
    }).select("id").single();
    if (!error && data) createdId = data.id;
  }
  if (!createdId) redirect(messagePath("/teacher", "error", "The class could not be created. Please try again."));
  redirect(`/teacher/classes/${createdId}`);
}

export async function createAssignment(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const classId = String(formData.get("classId") || "");
  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const instructions = String(formData.get("instructions") || "").trim().slice(0, 1500);
  const dueDate = String(formData.get("dueDate") || "");
  const questionIds = formData.getAll("questionIds").map(String).filter(Boolean).slice(0, 40);

  const { data: classRecord } = await supabase.from("classes").select("id,bank,course").eq("id", classId).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) redirect("/teacher?error=Class%20not%20found.");
  if (!title || questionIds.length === 0) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "Add a title and select at least one question."));

  const source = classRecord.bank === "igcse"
    ? progressManifest.igcse
    : progressManifest.courses[classRecord.course as keyof typeof progressManifest.courses];
  const summaries = new Map(source.questions.map((question) => [question.id, question]));
  const selected = questionIds.map((id) => summaries.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
  if (selected.length !== questionIds.length) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "One or more questions are no longer available."));

  const dueAt = dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null;
  const { data: assignment, error } = await supabase.from("assignments").insert({
    class_id: classId,
    teacher_id: user.id,
    title,
    instructions,
    due_at: dueAt,
    status: "published",
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !assignment) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The assignment could not be published."));

  const { error: questionsError } = await supabase.from("assignment_questions").insert(selected.map((question, position) => ({
    assignment_id: assignment.id,
    question_id: question.id,
    bank: classRecord.bank,
    position,
    title_snapshot: question.title,
    topic_snapshot: question.topics[0]?.sub || question.topics[0]?.main || "",
  })));
  if (questionsError) {
    await supabase.from("assignments").delete().eq("id", assignment.id);
    redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The selected questions could not be added."));
  }
  revalidatePath("/teacher");
  revalidatePath("/account");
  redirect(`/teacher/assignments/${assignment.id}?success=${encodeURIComponent("Assignment published.")}`);
}

export async function reviewTeacherApplication(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const applicantId = String(formData.get("applicantId") || "");
  const decision = String(formData.get("decision") || "");
  if (!applicantId || applicantId === user.id || !new Set(["approve", "decline"]).has(decision)) redirect("/teacher?error=That%20request%20could%20not%20be%20reviewed.");
  const values = decision === "approve"
    ? { role: "teacher", teacher_status: "approved", updated_at: new Date().toISOString() }
    : { role: "student", teacher_status: "rejected", updated_at: new Date().toISOString() };
  const { error } = await supabase.from("profiles").update(values).eq("user_id", applicantId).eq("teacher_status", "pending");
  if (error) redirect(`/teacher?error=${encodeURIComponent("The teacher request could not be updated.")}`);
  revalidatePath("/teacher");
  redirect(`/teacher?success=${encodeURIComponent(decision === "approve" ? "Teacher access approved." : "Teacher request declined.")}`);
}
