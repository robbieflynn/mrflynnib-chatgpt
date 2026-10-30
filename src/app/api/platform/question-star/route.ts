import { NextResponse } from "next/server";
import { getPlatformSession, type PlatformCurriculum } from "@/lib/platform-server";

export const dynamic = "force-dynamic";

type QuestionStarRequest = {
  curriculum?: unknown;
  questionId?: unknown;
  starred?: unknown;
};

function requestedCurriculum(value: unknown): PlatformCurriculum {
  return value === "igcse" ? "igcse" : "ib";
}

export async function POST(request: Request) {
  let body: QuestionStarRequest;
  try {
    body = await request.json() as QuestionStarRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const curriculum = requestedCurriculum(body.curriculum);
  const questionId = typeof body.questionId === "string" ? body.questionId.trim().slice(0, 160) : "";
  if (!questionId || typeof body.starred !== "boolean") {
    return NextResponse.json({ error: "Question and saved state are required" }, { status: 400 });
  }

  const session = await getPlatformSession(curriculum);
  if (!session.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const result = body.starred
    ? await session.supabase.from("question_stars").insert({
        user_id: session.user.id,
        bank: curriculum,
        question_id: questionId,
      })
    : await session.supabase.from("question_stars").delete()
        .eq("user_id", session.user.id)
        .eq("bank", curriculum)
        .eq("question_id", questionId);

  const succeeded = !result.error || (body.starred && result.error.code === "23505");
  if (!succeeded) {
    return NextResponse.json({ error: "The question could not be saved" }, { status: 500 });
  }

  return NextResponse.json({ questionId, starred: body.starred }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
