import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getZiinaPaymentIntent,
  isAllowedZiinaWebhookSource,
  verifyZiinaWebhookSignature,
} from "@/lib/ziina";

type ZiinaWebhookPayload = {
  event?: unknown;
  data?: { id?: unknown };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hmac-signature");
  if (!verifyZiinaWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }

  const enforceIpAllowlist = process.env.ZIINA_WEBHOOK_ENFORCE_IP !== "false";
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  if (enforceIpAllowlist && !isAllowedZiinaWebhookSource(forwardedFor)) {
    return NextResponse.json({ message: "Webhook source is not allowed." }, { status: 403 });
  }

  let payload: ZiinaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ZiinaWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Invalid webhook body." }, { status: 400 });
  }

  if (payload.event !== "payment_intent.status.updated") {
    return NextResponse.json({ received: true });
  }
  const intentId = payload.data?.id;
  if (typeof intentId !== "string" || !intentId) {
    return NextResponse.json({ message: "Payment intent ID is missing." }, { status: 400 });
  }

  const intent = await getZiinaPaymentIntent(intentId);
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("checkout_orders")
    .select("id,amount,currency_code,is_test")
    .eq("ziina_payment_intent_id", intent.id)
    .maybeSingle();

  if (orderError) {
    console.error("Ziina webhook order lookup failed", orderError.code);
    return NextResponse.json({ message: "Order lookup failed." }, { status: 500 });
  }
  if (!order) {
    console.warn("Ziina webhook has no matching checkout order", intent.id);
    return NextResponse.json({ received: true });
  }
  if (intent.amount !== order.amount || intent.currency_code !== order.currency_code) {
    console.error("Ziina webhook amount mismatch", intent.id);
    return NextResponse.json({ message: "Payment details do not match the order." }, { status: 409 });
  }

  const completedAt = intent.status === "completed" ? new Date().toISOString() : null;
  const { error: updateError } = await admin
    .from("checkout_orders")
    .update({ status: intent.status, completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (updateError) {
    console.error("Ziina webhook order update failed", updateError.code);
    return NextResponse.json({ message: "Order update failed." }, { status: 500 });
  }

  if (intent.status !== "completed") {
    return NextResponse.json({ received: true });
  }

  const allowTestEntitlements = process.env.ZIINA_ALLOW_TEST_ENTITLEMENTS === "true";
  if (order.is_test && !allowTestEntitlements) {
    return NextResponse.json({ received: true, testPayment: true, entitlementGranted: false });
  }

  const { error: entitlementError } = await admin.rpc("grant_course_entitlement_for_order", {
    order_uuid: order.id,
  });

  if (entitlementError) {
    console.error("Entitlement grant failed", entitlementError.code);
    return NextResponse.json({ message: "Entitlement grant failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true, entitlementGranted: true });
}
