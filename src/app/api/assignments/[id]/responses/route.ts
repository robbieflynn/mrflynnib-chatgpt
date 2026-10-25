import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getFixedAssignmentConfig } from "@/lib/assignment-answer-config";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function permanentError(message: string) {
  return /already been submitted|assignment not found|question not found|must sign in|student account|choose a valid answer|choose an answer|enter an answer|answer is too long|question part was not found|confirm that/i.test(message);
}

type PartConfig = { answers?: unknown; mode?: unknown };
type PartState = { attemptCount?: unknown; isCorrect?: unknown; result?: unknown };

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizedAnswer(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

async function repairFixedMultipleChoiceConfiguration({
  assignmentId,
  questionId,
  response,
  studentId,
  supabase,
}: {
  assignmentId: string;
  questionId: string;
  response: Record<string, unknown>;
  studentId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const selectedOption = Number(response.option);
  if (!Number.isInteger(selectedOption)) return false;

  const adminUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !serviceKey) return false;

  const [{ data: profile, error: profileError }, { data: assignment }, { data: question }] = await Promise.all([
    supabase.from("profiles").select("role").eq("user_id", studentId).maybeSingle(),
    supabase.from("assignments").select("id").eq("id", assignmentId).maybeSingle(),
    supabase.from("assignment_questions").select("bank").eq("assignment_id", assignmentId).eq("question_id", questionId).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (profile?.role !== "student") throw new Error("Student answers can only be submitted from a student account.");
  if (!assignment || !question) return false;

  const fixedConfig = getFixedAssignmentConfig(question.bank, questionId);
  if (fixedConfig?.type !== "multiple_choice" || fixedConfig.correctOption === null) return false;
  if (selectedOption < 0 || selectedOption >= fixedConfig.options.length) throw new Error("Choose a valid answer.");

  const admin = createSupabaseAdmin(adminUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: answerKeyError } = await admin.from("assignment_answer_keys").upsert({
    assignment_id: assignmentId,
    question_id: questionId,
    accepted_answers: fixedConfig.acceptedAnswers,
    numeric_answer: null,
    numeric_tolerance: null,
    correct_option: fixedConfig.correctOption,
    updated_at: new Date().toISOString(),
  }, { onConflict: "assignment_id,question_id" });
  if (answerKeyError) throw answerKeyError;

  const { error: questionError } = await admin.from("assignment_questions").update({
    response_type: "multiple_choice",
    response_options: fixedConfig.options,
  }).eq("assignment_id", assignmentId).eq("question_id", questionId);
  if (questionError) throw questionError;
  return true;
}

async function saveMultipartPart({
  assignmentId,
  questionId,
  requestId,
  response,
  studentId,
  supabase,
}: {
  assignmentId: string;
  questionId: string;
  requestId: string;
  response: Record<string, unknown>;
  studentId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const partKey = shortText(response.partKey, 30);
  if (!partKey) return null;

  const adminUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !serviceKey) return null;

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("user_id", studentId).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== "student") throw new Error("Student answers can only be submitted from a student account.");

  const [{ data: question }, { data: submission }] = await Promise.all([
    supabase.from("assignment_questions").select("response_type,bank").eq("assignment_id", assignmentId).eq("question_id", questionId).maybeSingle(),
    supabase.from("assignment_submissions").select("status").eq("assignment_id", assignmentId).eq("student_id", studentId).maybeSingle(),
  ]);
  if (!question) throw new Error("Question not found.");
  const fixedConfig = getFixedAssignmentConfig(question.bank, questionId);
  if ((fixedConfig?.type ?? question.response_type) !== "multipart") throw new Error("That question part was not found.");
  if (submission?.status === "submitted") throw new Error("This assignment has already been submitted.");

  const admin = createSupabaseAdmin(adminUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: priorRequest } = await admin
    .from("assignment_response_requests")
    .select("is_correct,result")
    .eq("student_id", studentId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (priorRequest?.result) return { isCorrect: priorRequest.is_correct as boolean | null, result: priorRequest.result as string };

  const { error: requestError } = await admin.from("assignment_response_requests").upsert({
    student_id: studentId,
    request_id: requestId,
    assignment_id: assignmentId,
    question_id: questionId,
    part_key: partKey,
  }, { onConflict: "student_id,request_id", ignoreDuplicates: true });
  if (requestError) throw requestError;

  const [{ data: answerKey, error: answerError }, { data: existing, error: existingError }] = await Promise.all([
    admin.from("assignment_answer_keys").select("accepted_answers").eq("assignment_id", assignmentId).eq("question_id", questionId).maybeSingle(),
    admin.from("assignment_responses").select("response,attempt_count").eq("assignment_id", assignmentId).eq("student_id", studentId).eq("question_id", questionId).maybeSingle(),
  ]);
  if (answerError || existingError) throw answerError || existingError;

  const storedAccepted = objectValue(answerKey?.accepted_answers);
  const fixedPart = fixedConfig?.parts.find((part) => part.label === partKey);
  const accepted = fixedConfig?.type === "multipart"
    ? Object.fromEntries(fixedConfig.parts.map((part) => [part.label, {
        mode: part.mode,
        answers: part.acceptedAnswers,
      }]))
    : storedAccepted;
  const config = fixedPart
    ? { mode: fixedPart.mode, answers: fixedPart.acceptedAnswers }
    : objectValue(accepted[partKey]) as PartConfig;
  if (!Object.keys(config).length) throw new Error("That question part was not found.");

  const existingResponse = objectValue(existing?.response);
  const parts = { ...objectValue(existingResponse.parts) };
  const states = { ...objectValue(existingResponse._partStates) } as Record<string, PartState>;
  const priorState = objectValue(states[partKey]) as PartState;
  const priorResult = String(priorState.result || "");
  if (["correct", "incorrect_final"].includes(priorResult) || (priorResult === "saved" && config.mode === "whiteboard")) {
    return {
      isCorrect: priorResult === "correct" ? true : priorResult === "incorrect_final" ? false : null,
      result: "locked",
    };
  }

  const partAnswer = shortText(response.partAnswer, 500);
  const whiteboard = config.mode === "whiteboard";
  if (whiteboard && partAnswer !== "__whiteboard__") throw new Error("Confirm that this part is on the whiteboard or paper.");
  if (!whiteboard && !partAnswer) throw new Error("Choose or enter an answer for this part.");

  const allowed = Array.isArray(config.answers) ? config.answers : [];
  const isCorrect = whiteboard ? null : allowed.some((answer) => normalizedAnswer(answer) === normalizedAnswer(partAnswer));
  const attemptCount = whiteboard ? 0 : Math.min(Number(priorState.attemptCount || 0) + 1, 2);
  const result = whiteboard ? "saved" : isCorrect ? "correct" : attemptCount < 2 ? "retry" : "incorrect_final";
  parts[partKey] = partAnswer;
  states[partKey] = { attemptCount, isCorrect, result };

  const configuredParts = Object.keys(accepted);
  const allPartsComplete = configuredParts.every((key) => ["correct", "incorrect_final", "saved"].includes(String(objectValue(states[key]).result || "")));
  const hasIncorrectPart = configuredParts.some((key) => objectValue(states[key]).result === "incorrect_final");
  const hasReviewPart = configuredParts.some((key) => objectValue(states[key]).result === "saved");
  const overallCorrect = !allPartsComplete || hasReviewPart ? null : !hasIncorrectPart;
  const overallAttempts = Math.max(0, ...Object.values(states).map((state) => Number(state.attemptCount || 0)));
  const now = new Date().toISOString();

  const responseRecord = {
    assignment_id: assignmentId,
    student_id: studentId,
    question_id: questionId,
    response: { ...existingResponse, parts, _partStates: states },
    is_correct: overallCorrect,
    attempt_count: overallAttempts,
    checked_at: allPartsComplete ? now : null,
    updated_at: now,
  };
  const progressRecord = {
    assignment_id: assignmentId,
    student_id: studentId,
    question_id: questionId,
    completed: allPartsComplete,
    completed_at: allPartsComplete ? now : null,
    updated_at: now,
  };
  const submissionRecord = { assignment_id: assignmentId, student_id: studentId, status: "in_progress", submitted_at: null, updated_at: now };
  const [{ error: responseError }, { error: progressError }, { error: submissionError }] = await Promise.all([
    admin.from("assignment_responses").upsert(responseRecord, { onConflict: "assignment_id,student_id,question_id" }),
    admin.from("assignment_question_progress").upsert(progressRecord, { onConflict: "assignment_id,student_id,question_id" }),
    admin.from("assignment_submissions").upsert(submissionRecord, { onConflict: "assignment_id,student_id" }),
  ]);
  if (responseError || progressError || submissionError) throw responseError || progressError || submissionError;

  const { error: requestUpdateError } = await admin
    .from("assignment_response_requests")
    .update({ is_correct: isCorrect, result })
    .eq("student_id", studentId)
    .eq("request_id", requestId);
  if (requestUpdateError) throw requestUpdateError;
  return { isCorrect, result };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now();
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ message: "Assignment not found.", retryable: false }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "That answer was not valid.", retryable: false }, { status: 400 });
  }

  const questionId = shortText(body.questionId, 160);
  const requestId = shortText(body.requestId, 80);
  const response = body.response ?? null;
  if (!questionId || !uuidPattern.test(requestId) || JSON.stringify(response).length > 2_000) {
    return NextResponse.json({ message: "That answer was not valid.", retryable: false }, { status: 400 });
  }

  const supabase = await createClient();
  const multipartResponse = response && typeof response === "object" && !Array.isArray(response)
    ? response as Record<string, unknown>
    : null;
  const multipartPartKey = shortText(multipartResponse?.partKey, 30);
  const multipartPartAnswer = shortText(multipartResponse?.partAnswer, 500);

  const rpcStartedAt = performance.now();
  const { data, error } = await supabase.rpc("submit_assignment_response_reliable", {
    assignment_uuid: id,
    question_key: questionId,
    request_uuid: requestId,
    response_payload: response,
  });
  const rpcDurationMs = performance.now() - rpcStartedAt;
  const reliableResult = Array.isArray(data) ? data[0] as { is_correct?: boolean | null; result?: string | null } : null;

  let saveError = error;
  let studentId = "";

  // The database function authenticates the request and enforces assignment
  // access itself. Avoid a second remote auth lookup on the successful path;
  // it made every answer check wait for auth before the actual save began.
  // We still resolve the verified user before any compatibility or repair path.
  if (error || (multipartPartKey && reliableResult?.result === "locked")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Please sign in again before saving.", retryable: false }, { status: 401 });
    studentId = user.id;
  }

  if (error && multipartResponse && !multipartPartKey) {
    try {
      const repaired = await repairFixedMultipleChoiceConfiguration({
        assignmentId: id,
        questionId,
        response: multipartResponse,
        studentId,
        supabase,
      });
      if (repaired) {
        const { data: repairedData, error: repairedError } = await supabase.rpc("submit_assignment_response_reliable", {
          assignment_uuid: id,
          question_key: questionId,
          request_uuid: requestId,
          response_payload: response,
        });
        if (!repairedError) {
          const repairedResult = Array.isArray(repairedData)
            ? repairedData[0] as { is_correct?: boolean | null; result?: string | null }
            : null;
          console.warn("Repaired stale assignment answer configuration", { assignmentId: id, questionId, studentId });
          return NextResponse.json({ isCorrect: repairedResult?.is_correct ?? null, result: repairedResult?.result ?? null }, {
            headers: { "Cache-Control": "no-store, max-age=0" },
          });
        }
        saveError = repairedError;
      }
    } catch (repairError) {
      const repairMessage = repairError instanceof Error ? repairError.message : "The answer could not be saved.";
      const repairPermanent = permanentError(repairMessage);
      console.error("Assignment answer configuration repair failed", { assignmentId: id, questionId, studentId, message: repairMessage });
      if (repairPermanent) {
        return NextResponse.json({ message: repairMessage, retryable: false }, { status: 400 });
      }
    }
  }

  if (multipartPartKey && (error || reliableResult?.result === "locked")) {
    // Some live databases still have the original whole-question version of
    // submit_assignment_response. Once any earlier part reaches two attempts,
    // that legacy function can incorrectly return "locked" for every remaining
    // part. The dedicated part RPC checks only the requested part.
    const { data: partData, error: partError } = await supabase.rpc("submit_assignment_part_response", {
      assignment_uuid: id,
      question_key: questionId,
      part_key: multipartPartKey,
      part_answer: multipartPartAnswer,
    });
    if (!partError) {
      const partResult = Array.isArray(partData) ? partData[0] as { is_correct?: boolean | null; result?: string | null } : null;
      console.warn("Used assignment part compatibility save", { assignmentId: id, questionId, studentId });
      return NextResponse.json({ isCorrect: partResult?.is_correct ?? null, result: partResult?.result ?? null }, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
    saveError = partError;
    console.error("Assignment part compatibility save failed", {
      assignmentId: id,
      questionId,
      studentId,
      code: partError.code,
      message: partError.message,
    });

    if (multipartResponse) {
      try {
        const fallbackResult = await saveMultipartPart({
          assignmentId: id,
          questionId,
          requestId,
          response: multipartResponse,
          studentId,
          supabase,
        });
        if (fallbackResult) return NextResponse.json(fallbackResult, { headers: { "Cache-Control": "no-store, max-age=0" } });
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "The answer could not be saved.";
        const fallbackPermanent = permanentError(fallbackMessage);
        console.error("Assignment part server fallback failed", { assignmentId: id, questionId, studentId, message: fallbackMessage });
        if (fallbackPermanent) {
          return NextResponse.json({ message: fallbackMessage, retryable: false }, { status: 400 });
        }
      }
    }
  }

  if (saveError) {
    const message = saveError.message || "The answer could not be saved.";
    const isPermanent = permanentError(message);
    console.error("Assignment answer save failed", {
      assignmentId: id,
      questionId,
      studentId,
      code: saveError.code,
      message,
    });
    return NextResponse.json({
      message: isPermanent ? message : "We could not confirm this save yet. We will retry automatically.",
      retryable: !isPermanent,
    }, { status: isPermanent ? 400 : 503 });
  }

  return NextResponse.json({ isCorrect: reliableResult?.is_correct ?? null, result: reliableResult?.result ?? null }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Server-Timing": `answer-rpc;dur=${rpcDurationMs.toFixed(1)}, total;dur=${(performance.now() - startedAt).toFixed(1)}`,
    },
  });
}
