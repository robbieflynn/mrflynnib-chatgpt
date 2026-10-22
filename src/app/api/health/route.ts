import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, reason: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${url}/rest/v1/classes?select=id&limit=1`, {
      cache: "no-store",
      headers: { apikey: key },
      signal: controller.signal,
    });
    return { ok: response.ok, reason: response.ok ? null : `http_${response.status}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const database = await checkSupabase();
  return NextResponse.json(
    { checkedAt, database: database.ok ? "operational" : "degraded", website: "operational" },
    { status: database.ok ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
