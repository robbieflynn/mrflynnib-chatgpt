import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAssignmentHints } from "@/lib/assignment-hints";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function reply(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

async function handle(request: NextRequest, context: { params: Promise<{ id: string }> }, reveal: boolean) {
  try {
    const { id } = await context.params;
    if (!uuid.test(id)) return reply({ error: "Assignment not found." }, 404);
    if (reveal && request.headers.get("origin") !== request.nextUrl.origin) return reply({ error: "Please reopen this assignment." }, 403);
    const body = reveal ? await request.json().catch(() => null) : null;
    const questionId = reveal ? body?.questionId : request.nextUrl.searchParams.get("questionId");
    if (typeof questionId !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(questionId)) return reply({ error: "Choose a question." }, 400);
    if (reveal && (!Number.isInteger(body?.expectedCount) || body.expectedCount < 0)) return reply({ error: "Reload hints and try again." }, 400);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Please sign in again to use hints." }, 401);
    const [{ data: assignment, error: assignmentError }, { data: profile }, { data: question }] = await Promise.all([
      supabase.from("assignments").select("id,class_id,status,allow_hints,classes(course)").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("assignment_questions").select("question_id").eq("assignment_id", id).eq("question_id", questionId).maybeSingle(),
    ]);
    if (assignmentError) return reply({ error: "Hints are temporarily unavailable. Please try again." }, 503);
    if (!assignment || !question || profile?.role !== "student") return reply({ error: "Assignment not available." }, 403);
    // Assignment RLS enforces published state, class membership and targeted recipients.
    const [{ data: usage, error: usageError }, { data: submission, error: submissionError }] = await Promise.all([
      supabase.from("assignment_hint_usage").select("revealed_steps").eq("assignment_id", id).eq("student_id", user.id).eq("question_id", questionId).maybeSingle(),
      supabase.from("assignment_submissions").select("status").eq("assignment_id", id).eq("student_id", user.id).maybeSingle(),
    ]);
    if (usageError || submissionError) return reply({ error: "Hints could not be loaded. Please try again." }, 503);
    let steps = Array.isArray(usage?.revealed_steps) ? usage.revealed_steps : [];
    const canReveal = assignment.allow_hints && assignment.status === "published" && submission?.status !== "submitted";
    const classRecord = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
    const authored = canReveal ? await getAssignmentHints(classRecord?.course || "", questionId) : [];
    if (reveal) {
      if (!canReveal) return reply({ error: submission?.status === "submitted" ? "This assignment has been submitted." : "Your teacher has switched hints off." }, 409);
      if (body.expectedCount >= authored.length) return reply({ error: "All available hints have been shown." }, 409);
      const { data, error } = await createAdminClient().rpc("reveal_assignment_hint", {
        assignment_uuid: id, student_uuid: user.id, question_key: questionId,
        expected_count: body.expectedCount, hint_step: authored[body.expectedCount],
      });
      if (error) return reply({ error: "The hint could not be saved. Please reload hints and try again." }, 409);
      steps = data;
    }
    return reply({ steps, total: Math.max(authored.length, steps.length), enabled: Boolean(assignment.allow_hints), submitted: submission?.status === "submitted", canReveal: Boolean(canReveal && steps.length < authored.length) });
  } catch { return reply({ error: "Hints are temporarily unavailable. Please try again." }, 503); }
}
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { return handle(request, context, false); }
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) { return handle(request, context, true); }
