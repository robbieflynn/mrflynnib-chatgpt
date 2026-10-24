import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_PATTERN = /^cs_(?:test_|live_)?[A-Za-z0-9_]+$/;

export async function GET(request: Request) {
  const session = await getPlatformAccess();
  if (!session.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const checkoutSessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!SESSION_PATTERN.test(checkoutSessionId) || checkoutSessionId.length > 200) {
    return NextResponse.json({ error: "Invalid checkout" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: purchase, error } = await admin
    .from("platform_purchases")
    .select("status,product_code,access_expires_at")
    .eq("user_id", session.user.id)
    .eq("checkout_session_id", checkoutSessionId)
    .maybeSingle();
  if (error) return NextResponse.json({ status: "pending" }, { headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({
    status: purchase?.status === "paid" ? "active" : purchase?.status || "pending",
    productCode: purchase?.product_code || null,
    expiresAt: purchase?.access_expires_at || null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
