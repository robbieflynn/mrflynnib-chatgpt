import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const curriculum = body.curriculum === "igcse" ? "igcse" : "ib";
  const session = await getPlatformSession(curriculum);
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const questionId = typeof body.questionId === "string" ? body.questionId.slice(0, 160) : "";
  if (!questionId) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  const completed = Boolean(body.completed);
  const now = new Date().toISOString();
  const { error } = await session.supabase.from("question_progress").upsert({ user_id: session.user.id, bank: session.curriculum, question_id: questionId, completed, completed_at: completed ? now : null, updated_at: now }, { onConflict: "user_id,bank,question_id" });
  return NextResponse.json(error ? { error: "Progress could not be saved" } : { ok: true, completed }, { status: error ? 503 : 200 });
}
