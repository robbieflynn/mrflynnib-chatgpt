import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const curriculum = url.searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const session = await getPlatformSession(curriculum);
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const questionId = url.searchParams.get("questionId")?.slice(0, 160) || "";
  if (!questionId) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  const { data, error } = await session.supabase.from("whiteboard_documents").select("document,updated_at").eq("user_id", session.user.id).eq("bank", session.curriculum).eq("question_id", questionId).maybeSingle();
  return NextResponse.json(error ? { error: "Whiteboard could not be loaded" } : { document: data?.document || null, updatedAt: data?.updated_at || null }, { status: error ? 503 : 200 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const curriculum = body.curriculum === "igcse" ? "igcse" : "ib";
  const session = await getPlatformSession(curriculum);
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const questionId = typeof body.questionId === "string" ? body.questionId.slice(0, 160) : "";
  const encoded = JSON.stringify(body.document ?? null);
  if (!questionId || encoded.length > 1_500_000) return NextResponse.json({ error: "Invalid whiteboard" }, { status: 400 });
  const { error } = await session.supabase.from("whiteboard_documents").upsert({ user_id: session.user.id, bank: session.curriculum, question_id: questionId, document: body.document, document_version: 1, updated_at: new Date().toISOString() }, { onConflict: "user_id,bank,question_id" });
  return NextResponse.json(error ? { error: "Whiteboard could not be saved" } : { ok: true }, { status: error ? 503 : 200 });
}
