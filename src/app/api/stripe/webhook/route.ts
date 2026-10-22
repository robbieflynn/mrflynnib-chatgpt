import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySignature(body: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature") || "";
  if (!secret || !verifySignature(body, signature, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  const event = JSON.parse(body);
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const session = event.data?.object;
  const userId = session?.metadata?.user_id;
  const productCode = session?.metadata?.product_code;
  if (!userId || !productCode || session.payment_status !== "paid") return NextResponse.json({ received: true });
  const admin = createAdminClient();
  const { data: existingEvent } = await admin.from("payment_events").select("provider_event_id,status").eq("provider_event_id", event.id).maybeSingle();
  if (existingEvent?.status === "processed") return NextResponse.json({ received: true });
  await admin.from("payment_events").upsert({ provider_event_id: event.id, event_type: event.type, status: "processing", payload: { checkout_session_id: session.id, product_code: productCode } }, { onConflict: "provider_event_id" });
  const accessDays = Math.max(1, Math.min(Number(session.metadata.access_days) || 365, 3650));
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + accessDays * 86_400_000);
  const { error } = await admin.from("platform_entitlements").upsert({ user_id: userId, product_code: productCode, status: "active", source: "stripe", starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString(), external_provider: "stripe", external_reference: session.id, metadata: { payment_intent: session.payment_intent, amount_total: session.amount_total, currency: session.currency } }, { onConflict: "external_provider,external_reference" });
  if (!error && typeof session.customer === "string") await admin.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: session.customer, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await admin.from("payment_events").update({ status: error ? "failed" : "processed", processed_at: new Date().toISOString() }).eq("provider_event_id", event.id);
  return NextResponse.json({ received: true }, { status: error ? 500 : 200 });
}
