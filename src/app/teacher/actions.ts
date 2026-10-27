"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import progressManifest from "@/data/question-bank-progress.json";
import { requireAdmin, requireTeacher } from "@/lib/account-access";
import { isAssignmentFeedbackMode } from "@/lib/assignment-feedback";
import { getFixedAssignmentConfig, type FixedAssignmentConfig } from "@/lib/assignment-answer-config";
import { orderAssessmentQuestions } from "@/lib/assessment-question-order";

const validCourses = new Set(["AA HL", "AA SL", "AI HL", "AI SL", "IGCSE Higher"]);

function teacherReviewResponseConfig(id: string): FixedAssignmentConfig {
  return {
    id,
    type: "teacher_review",
    acceptedAnswers: [],
    options: [],
    correctOption: null,
    parts: [],
  };
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
  const bank = course === "IGCSE Higher" ? "igcse" : "ib";
  const courseMatchesArea = area === "igcse" ? course === "IGCSE Higher" : course !== "IGCSE Higher";
  if (!name || !validCourses.has(course) || !courseMatchesArea) redirect(messagePath(dashboardPath, "error", "Add a class name and choose a course."));

  const { data: recentMatch } = await supabase.from("classes")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("name", name)
    .eq("bank", bank)
    .eq("course", course)
    .eq("archived", false)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentMatch) redirect(`/teacher/classes/${recentMatch.id}`);

  let createdId = "";
  for (let attempt = 0; attempt < 5 && !createdId; attempt += 1) {
    const joinCode = randomBytes(5).toString("base64url").replace(/[-_]/g, "").slice(0, 7).toUpperCase();
    const { data, error } = await supabase.from("classes").insert({
      teacher_id: user.id,
      name,
      bank,
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
  const recipientMode = formData.get("recipientMode") === "students" ? "students" : "class";
  const requestedRecipientIds = Array.from(new Set(formData.getAll("recipientIds").map(String).filter(Boolean))).slice(0, 1000);
  const questionIds = Array.from(new Set(formData.getAll("questionIds").map(String).filter(Boolean))).slice(0, 100);

  const { data: classRecord } = await supabase.from("classes").select("id,bank,course").eq("id", classId).eq("teacher_id", user.id).maybeSingle();
  if (!classRecord) redirect("/teacher?error=Class%20not%20found.");
  if (!title || questionIds.length === 0) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "Add a title and select at least one question."));
  let recipientIds: string[] = [];
  if (recipientMode === "students") {
    const { data: membershipRows, error: membershipError } = await supabase.from("class_memberships").select("student_id").eq("class_id", classId);
    if (membershipError) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The class list could not be checked. Please try again."));
    const memberIds = new Set((membershipRows ?? []).map((membership) => String(membership.student_id)));
    recipientIds = requestedRecipientIds.filter((studentId) => memberIds.has(studentId));
    if (!requestedRecipientIds.length || recipientIds.length !== requestedRecipientIds.length) {
      redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "Choose at least one current student for this assignment."));
    }
  }

  const source = classRecord.bank === "igcse"
    ? progressManifest.igcse
    : progressManifest.courses[classRecord.course as keyof typeof progressManifest.courses];
  const summaries = new Map(source.questions.map((question) => [question.id, question]));
  const selectedInChosenOrder = questionIds.map((id) => summaries.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
  const selected = orderAssessmentQuestions(selectedInChosenOrder.map((question) => ({
    ...question,
    paper: question.paperNumber || question.paper || "",
    section: "section" in question && question.section === "B" ? "B" : "A",
  })), classRecord.course as "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher");
  if (selected.length !== questionIds.length) redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "One or more questions are no longer available."));
  const responseConfigs = new Map(questionIds.map((id) => [
    id,
    getFixedAssignmentConfig(classRecord.bank, id) ?? teacherReviewResponseConfig(id),
  ]));

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

  if (recipientIds.length) {
    const { error: recipientsError } = await supabase.from("assignment_recipients").insert(recipientIds.map((studentId) => ({
      assignment_id: assignment.id,
      student_id: studentId,
    })));
    if (recipientsError) {
      await supabase.from("assignments").delete().eq("id", assignment.id);
      redirect(messagePath(`/teacher/classes/${classId}/assignments/new`, "error", "The selected students could not be saved."));
    }
  }

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
          ? config.parts.map((part) => ({ label: part.label, mode: part.mode, options: part.options }))
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
      accepted_answers: config.type === "multiple_choice" ? config.acceptedAnswers : multipartAnswers,
      numeric_answer: null,
      numeric_tolerance: null,
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

export async function reuseAssignment(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const assignmentId = String(formData.get("assignmentId") || "");
  const targetClassId = String(formData.get("targetClassId") || "");
  if (!assignmentId || !targetClassId) redirect(messagePath("/teacher", "error", "Choose a class for the reused assignment."));

  const [{ data: assignment }, { data: targetClass }] = await Promise.all([
    supabase.from("assignments").select("id,class_id").eq("id", assignmentId).eq("teacher_id", user.id).maybeSingle(),
    supabase.from("classes").select("id,bank,course").eq("id", targetClassId).eq("teacher_id", user.id).eq("archived", false).maybeSingle(),
  ]);
  if (!assignment || !targetClass) redirect(messagePath("/teacher", "error", "The assignment or class could not be found."));

  const { data: sourceClass } = await supabase.from("classes").select("bank,course").eq("id", assignment.class_id).eq("teacher_id", user.id).maybeSingle();
  if (!sourceClass || sourceClass.bank !== targetClass.bank || sourceClass.course !== targetClass.course) {
    redirect(messagePath(`/teacher/assignments/${assignmentId}`, "error", "Choose another class studying the same course."));
  }

  redirect(`/teacher/classes/${targetClassId}/assignments/new?reuseOf=${encodeURIComponent(assignmentId)}`);
}

export async function deleteAssignment(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const assignmentId = String(formData.get("assignmentId") || "");
  if (!assignmentId) redirect("/teacher?error=Assignment%20not%20found.");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id,class_id")
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!assignment) redirect("/teacher?error=Assignment%20not%20found.");

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("teacher_id", user.id);
  if (error) redirect(messagePath(`/teacher/assignments/${assignmentId}`, "error", "The assignment could not be deleted."));

  revalidatePath("/teacher");
  revalidatePath("/igcse/teacher");
  revalidatePath(`/teacher/classes/${assignment.class_id}`);
  revalidatePath("/account");
  revalidatePath("/igcse/account");
  redirect(messagePath(`/teacher/classes/${assignment.class_id}`, "success", "Assignment deleted."));
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

export async function returnAssignmentToStudent(formData: FormData) {
  const { supabase, user } = await requireTeacher();
  const assignmentId = String(formData.get("assignmentId") || "");
  const studentId = String(formData.get("studentId") || "");
  const returnPath = `/teacher/assignments/${assignmentId}/students/${studentId}`;

  if (!assignmentId || !studentId) {
    redirect(messagePath("/teacher", "error", "The assignment or student could not be found."));
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id,class_id")
    .eq("id", assignmentId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!assignment) redirect(messagePath("/teacher", "error", "The assignment could not be found."));

  const { data: membership } = await supabase
    .from("class_memberships")
    .select("student_id")
    .eq("class_id", assignment.class_id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!membership) redirect(messagePath(`/teacher/assignments/${assignmentId}`, "error", "The student could not be found in this class."));

  const { error } = await supabase.rpc("return_assignment_to_student", {
    assignment_uuid: assignmentId,
    student_uuid: studentId,
  });
  if (error) redirect(messagePath(returnPath, "error", "The assignment could not be returned. Please try again."));

  revalidatePath(returnPath);
  revalidatePath(`/teacher/assignments/${assignmentId}`);
  revalidatePath(`/teacher/classes/${assignment.class_id}`);
  revalidatePath("/account");
  revalidatePath("/igcse/account");
  revalidatePath(`/assignments/${assignmentId}`);
  redirect(messagePath(returnPath, "success", "Assignment returned. The student can continue their work and submit it again."));
}

export async function reviewTeacherApplication(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const applicantId = String(formData.get("applicantId") || "");
  const decision = String(formData.get("decision") || "");
  const requestedReturnTo = String(formData.get("returnTo") || "");
  const returnTo = new Set(["/teacher/accounts", "/teacher/accounts?access=pending"]).has(requestedReturnTo)
    ? requestedReturnTo
    : "/teacher";
  const reviewMessagePath = (key: "error" | "success", message: string) => `${returnTo}${returnTo.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
  if (!applicantId || applicantId === user.id || !new Set(["approve", "decline"]).has(decision)) redirect(reviewMessagePath("error", "That request could not be reviewed."));
  const values = decision === "approve"
    ? { role: "teacher", teacher_status: "approved", updated_at: new Date().toISOString() }
    : { role: "student", teacher_status: "rejected", updated_at: new Date().toISOString() };
  const { error } = await supabase.from("profiles").update(values).eq("user_id", applicantId).eq("teacher_status", "pending");
  if (error) redirect(reviewMessagePath("error", "The teacher account could not be updated."));
  revalidatePath("/teacher");
  revalidatePath("/teacher/accounts");
  redirect(reviewMessagePath("success", decision === "approve" ? "Teacher account activated." : "The account remains a student account."));
}
