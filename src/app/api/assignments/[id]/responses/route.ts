import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function permanentError(message: string) {
  return /already been submitted|assignment not found|question not found|must sign in|student account|choose a valid answer|choose an answer|enter an answer|answer is too long|question part was not found|confirm that|complete every part/i.test(message);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Please sign in again before saving.", retryable: false }, { status: 401 });

  const { data, error } = await supabase.rpc("submit_assignment_response_reliable", {
    assignment_uuid: id,
    question_key: questionId,
    request_uuid: requestId,
    response_payload: response,
  });

  if (error) {
    const message = error.message || "The answer could not be saved.";
    const isPermanent = permanentError(message);
    console.error("Assignment answer save failed", {
      assignmentId: id,
      questionId,
      studentId: user.id,
      code: error.code,
      message,
    });
    return NextResponse.json({
      message: isPermanent ? message : "The online save service did not respond. Your answer is safe on this device and will retry automatically.",
      retryable: !isPermanent,
    }, { status: isPermanent ? 400 : 503 });
  }

  const result = Array.isArray(data) ? data[0] as { is_correct?: boolean | null; result?: string | null } : null;
  return NextResponse.json({ isCorrect: result?.is_correct ?? null, result: result?.result ?? null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
