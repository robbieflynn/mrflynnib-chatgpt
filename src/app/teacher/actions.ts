"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import progressManifest from "@/data/question-bank-progress.json";
import { requireAdmin, requireTeacher } from "@/lib/account-access";
import { isAssignmentFeedbackMode } from "@/lib/assignment-feedback";

const validCourses = new Set(["AA HL", "AA SL", "AI HL", "AI SL", "IGCSE Higher"]);
const validResponseTypes = new Set(["teacher_review", "exact", "numeric", "multiple_choice", "multipart"]);

type ResponsePart = {
  label: string;
  mode: "exact" | "whiteboard";
  acceptedAnswers: string[];
};

type ResponseConfig = {
  id: string;
  type: "teacher_review" | "exact" | "numeric" | "multiple_choice" | "multipart";
  acceptedAnswers: string[];
  numericAnswer: number | null;
  tolerance: number | null;
  options: string[];
  correctOption: number | null;
  parts: ResponsePart[];
};

function parseResponseConfig(value: FormDataEntryValue): ResponseConfig | null {
  try {
    const raw = JSON.parse(String(value)) as Record<string, unknown>;
    const id = String(raw.id || "").slice(0, 160);
    const type = validResponseTypes.has(String(raw.type)) ? String(raw.type) as ResponseConfig["type"] : "teacher_review";
    const acceptedAnswers = (Array.isArray(raw.acceptedAnswers)
      ? raw.acceptedAnswers.map(String)
      : String(raw.acceptedAnswers || "").split("|"))
      .map((item) => item.trim().slice(0, 180))
      .filter(Boolean)
      .slice(0, 12);
    const numericAnswer = String(raw.numericAnswer ?? "").trim() === "" ? null : Number(raw.numericAnswer);
    const tolerance = String(raw.tolerance ?? "").trim() === "" ? null : Number(raw.tolerance);
    const options = Array.isArray(raw.options) ? raw.options.slice(0, 4).map((item) => String(item).trim().slice(0, 180)) : [];
    const correctOption = Number.isInteger(Number(raw.correctOption)) ? Number(raw.correctOption) : null;
    const parts = (Array.isArray(raw.parts) ? raw.parts : []).map((part) => {
      const value = part && typeof part === "object" ? part as Record<string, unknown> : {};
      const label = String(value.label || "").trim().slice(0, 30);
      const mode: ResponsePart["mode"] = value.mode === "whiteboard" ? "whiteboard" : "exact";
      const partAnswers = (Array.isArray(value.acceptedAnswers) ? value.acceptedAnswers : [])
        .map(String)
        .map((item) => item.trim().slice(0, 180))
        .filter(Boolean)
        .slice(0, 12);
      return { label, mode, acceptedAnswers: partAnswers };
    }).filter((part) => part.label && (part.mode === "whiteboard" || part.acceptedAnswers.length)).slice(0, 30);
    if (!id) return null;
    if (type === "exact" && acceptedAnswers.length === 0) return null;
    if (type === "numeric" && (!Number.isFinite(numericAnswer) || !Number.isFinite(tolerance) || Number(tolerance) < 0)) return null;
    if (type === "multiple_choice" && (options.length !== 4 || options.some((option) => !option) || correctOption === null || correctOption < 0 || correctOption >= options.length)) return null;
    if (type === "multipart" && parts.length < 2) return null;
    return { id, type, acceptedAnswers, numericAnswer, tolerance, options, correctOption, parts };
  } catch {
    return null;
  }
}

function messagePath(path: string, key: "error" | "success", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

export async function createClass(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const course = String(formData.get("course") || "");
  const area = formData.get("area") === "igcse" ? "igcse" : "ib";
  const dashboardPath = area === "igcse" ? "/igcse/teacher" : "/teacher";
  const courseMatchesArea = area === "igcse" ? course === "IGCSE Higher" : course !== "IGCSE Higher";
  if (!name || !validCourses.has(course) || !courseMatchesArea) redirect(messagePath(dashboardPath, "error", "Add a class name and choose a course."));

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
  if (!createdId) redirect(messagePath(dashboardPath, "error", "The class could not be created. Please try again."));
  redirect(`/teacher/classes/${createdId}`);
}

export async function createAssignment(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const classId = String(formData.get("classId") || "");
  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const instructions = String(formData.get("instructions") || "").trim().slice(0, 1500);
  const dueDate = String(formData.get("dueDate") || "");
  const requestedFeedbackMode = String(formData.get("feedbackMode") || "after_question");
  const feedbackMode = isAssignmentFeedbackMode(requestedFeedbackMode) ? requestedFeedbackMode : "after_question";
  const questionIds = formData.getAll("questionIds").map(String).filter(Boolean).slice(0, 100);
  const parsedConfigs = formData.getAll("responseConfigs").map(parseResponseConfig);
  const responseConfigs = new Map(parsedConfigs.filter((config): config is ResponseConfig => Boolean(config)).map((config) => [config.id, config]));

  const { data: classRecord } = await supabase.from("classes").select("id,bank,course").eq("id", classId).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) redirect("/teacher?error=Class%20not%20found.");
  if (!title || questionIds.length === 0) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "Add a title and select at least one question."));
  if (questionIds.some((id) => !responseConfigs.has(id))) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "Finish the answer-checking setup for every selected question."));

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
    show_mark_scheme: feedbackMode !== "hidden",
    feedback_mode: feedbackMode,
    published_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !assignment) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The assignment could not be published."));

  const { error: questionsError } = await supabase.from("assignment_questions").insert(selected.map((question, position) => {
    const config = responseConfigs.get(question.id)!;
    return {
      assignment_id: assignment.id,
      question_id: question.id,
      bank: classRecord.bank,
      position,
      title_snapshot: question.title,
      topic_snapshot: question.topics[0]?.sub || question.topics[0]?.main || "",
      response_type: config.type,
      response_options: config.type === "multiple_choice"
        ? config.options
        : config.type === "multipart"
          ? config.parts.map((part) => ({ label: part.label, mode: part.mode }))
          : [],
    };
  }));
  if (questionsError) {
    await supabase.from("assignments").delete().eq("id", assignment.id);
    redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The selected questions could not be added."));
  }
  const answerKeys = selected.flatMap((question) => {
    const config = responseConfigs.get(question.id)!;
    if (config.type === "teacher_review") return [];
    const multipartAnswers = config.type === "multipart"
      ? Object.fromEntries(config.parts.map((part) => [part.label, { mode: part.mode, answers: part.acceptedAnswers }]))
      : [];
    return [{
      assignment_id: assignment.id,
      question_id: question.id,
      accepted_answers: config.type === "exact" ? config.acceptedAnswers : multipartAnswers,
      numeric_answer: config.type === "numeric" ? config.numericAnswer : null,
      numeric_tolerance: config.type === "numeric" ? config.tolerance : null,
      correct_option: config.type === "multiple_choice" ? config.correctOption : null,
    }];
  });
  if (answerKeys.length) {
    const { error: answerKeyError } = await supabase.from("assignment_answer_keys").insert(answerKeys);
    if (answerKeyError) {
      await supabase.from("assignments").delete().eq("id", assignment.id);
      redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The answer-checking setup could not be saved."));
    }
  }
  revalidatePath("/teacher");
  revalidatePath("/account");
  redirect(`/teacher/assignments/${assignment.id}?success=${encodeURIComponent("Assignment published.")}`);
}

export async function updateAssignmentFeedbackMode(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const assignmentId = String(formData.get("assignmentId") || "");
  const requestedFeedbackMode = String(formData.get("feedbackMode") || "");
  if (!assignmentId) redirect("/teacher?error=Assignment%20not%20found.");
  if (!isAssignmentFeedbackMode(requestedFeedbackMode)) redirect(messagePath(`/teacher/assignments/${assignmentId}`, "error", "Choose when students can see feedback."));

  const { data: assignment, error } = await supabase
    .from("assignments")
    .update({
      feedback_mode: requestedFeedbackMode,
      show_mark_scheme: requestedFeedbackMode !== "hidden",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !assignment) {
    redirect(messagePath(`/teacher/assignments/${assignmentId}`, "error", "The feedback setting could not be updated."));
  }
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath(`/assignments/${assignmentId}`);
  redirect(messagePath(`/teacher/assignments/${assignmentId}`, "success", "The student feedback setting has been updated."));
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
