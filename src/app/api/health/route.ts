import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkSupabaseRequest(path: string, init?: RequestInit) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { ok: false, reason: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${url}${path}`, {
      cache: "no-store",
      ...init,
      headers: { apikey: key, "Content-Type": "application/json", ...init?.headers },
      signal: controller.signal,
    });
    return { ok: response.ok, reason: response.ok ? null : `http_${response.status}`, response };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSupabase() {
  const database = await checkSupabaseRequest("/rest/v1/classes?select=id&limit=1");
  if (!database.ok) return { ok: false, reason: database.reason };

  // Exercise the same RPC gateway students use to save answers. An anonymous
  // request is expected to be rejected by the function itself; reaching that
  // controlled rejection proves the save route is present and responding.
  const saveApi = await checkSupabaseRequest("/rest/v1/rpc/submit_assignment_response_reliable", {
    method: "POST",
    body: JSON.stringify({
      assignment_uuid: "00000000-0000-0000-0000-000000000000",
      question_key: "health-check",
      request_uuid: "00000000-0000-4000-8000-000000000000",
      response_payload: {},
    }),
  });
  if (saveApi.ok) return { ok: true, reason: null };
  if (saveApi.response?.status === 400) {
    const payload = await saveApi.response.json().catch(() => null) as { code?: string; message?: string } | null;
    if (payload?.code === "P0001" && /sign in/i.test(payload.message || "")) return { ok: true, reason: null };
  }
  return { ok: false, reason: `save_${saveApi.reason}` };
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const database = await checkSupabase();
  return NextResponse.json(
    { checkedAt, database: database.ok ? "operational" : "degraded", website: "operational" },
    { status: database.ok ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
