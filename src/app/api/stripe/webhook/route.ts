import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPaidProductPlan, paidProductForCode } from "@/lib/platform-products";
import { createAdminClient } from "@/lib/supabase/admin";

type StripeObject = Record<string, unknown>;
type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: StripeObject };
};
type AdminClient = ReturnType<typeof createAdminClient>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function object(value: unknown): StripeObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as StripeObject : {};
}

function configuredForLivePayments() {
  return process.env.STRIPE_MODE === "live";
}

function verifySignature(body: string, header: string, secret: string) {
  const values = header.split(",").map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), part.slice(separator + 1)];
  });
  const timestamp = Number(values.find(([key]) => key === "t")?.[1]);
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !signatures.length) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"), "hex");
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

async function updateEvent(admin: AdminClient, event: StripeEvent, status: "processing" | "processed" | "ignored" | "failed", payload: StripeObject) {
  return admin.from("payment_events").upsert({
    provider_event_id: event.id,
    event_type: event.type,
    status,
    payload,
    processed_at: status === "processed" || status === "ignored" ? new Date().toISOString() : null,
  }, { onConflict: "provider_event_id" });
}

async function fulfilCheckout(admin: AdminClient, event: StripeEvent, session: StripeObject) {
  const metadata = object(session.metadata);
  const userId = text(metadata.user_id);
  const productCode = text(metadata.product_code);
  const product = paidProductForCode(productCode);
  const planId = text(metadata.plan_id);
  const plan = getPaidProductPlan(product, planId);
  const sessionId = text(session.id);
  const paymentStatus = text(session.payment_status);
  const amountTotal = number(session.amount_total);
  const amountDiscount = number(object(session.total_details).amount_discount);
  const currency = text(session.currency).toLowerCase();
  const customerId = text(session.customer) || null;
  const paymentIntentId = text(session.payment_intent) || null;
  const expectedAmount = plan ? plan.priceUsd * 100 : 0;
  const validAmount = amountTotal === expectedAmount
    || (amountTotal < expectedAmount && amountDiscount > 0 && amountTotal + amountDiscount === expectedAmount);
  const valid = Boolean(
    product
    && plan
    && userId
    && sessionId.startsWith("cs_")
    && text(session.client_reference_id) === userId
    && text(session.mode) === "payment"
    && currency === "usd"
    && validAmount
    && event.livemode === configuredForLivePayments()
  );
  if (!valid) return { ignored: true, payload: { checkout_session_id: sessionId, product_code: productCode } };

  const purchaseBase = {
    user_id: userId,
    product_code: productCode,
    provider: "stripe",
    checkout_session_id: sessionId,
    payment_intent_id: paymentIntentId,
    customer_id: customerId,
    livemode: event.livemode,
    amount_total: amountTotal,
    currency,
    access_days: plan!.accessDays,
    metadata: { amount_discount: amountDiscount, plan_id: plan!.id },
    updated_at: new Date().toISOString(),
  };

  if (!(["paid", "no_payment_required"].includes(paymentStatus))) {
    const { error } = await admin.from("platform_purchases").upsert({ ...purchaseBase, status: "pending" }, { onConflict: "checkout_session_id" });
    if (error) throw error;
    return { ignored: false, payload: { checkout_session_id: sessionId, product_code: productCode, payment_status: paymentStatus } };
  }

  const { data: previousPurchase } = await admin
    .from("platform_purchases")
    .select("status")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();
  if (["paid", "partially_refunded", "refunded"].includes(previousPurchase?.status || "")) {
    return {
      ignored: false,
      payload: {
        checkout_session_id: sessionId,
        product_code: productCode,
        duplicate: true,
        purchase_status: previousPurchase?.status,
      },
    };
  }

  const now = new Date();
  const { data: existingPaymentEntitlement } = await admin
    .from("platform_entitlements")
    .select("starts_at,expires_at")
    .eq("external_provider", "stripe")
    .eq("external_reference", sessionId)
    .maybeSingle();

  let accessStartsAt = now;
  let accessExpiresAt: Date;
  if (existingPaymentEntitlement) {
    accessStartsAt = new Date(existingPaymentEntitlement.starts_at);
    accessExpiresAt = existingPaymentEntitlement.expires_at
      ? new Date(existingPaymentEntitlement.expires_at)
      : new Date(accessStartsAt.getTime() + plan!.accessDays * 86_400_000);
  } else {
    accessExpiresAt = new Date(now.getTime() + plan!.accessDays * 86_400_000);

    const { error: entitlementError } = await admin.from("platform_entitlements").upsert({
      user_id: userId,
      product_code: productCode,
      status: "active",
      source: "stripe",
      starts_at: accessStartsAt.toISOString(),
      expires_at: accessExpiresAt.toISOString(),
      external_provider: "stripe",
      external_reference: sessionId,
      metadata: { payment_intent: paymentIntentId, amount_total: amountTotal, currency, livemode: event.livemode, plan_id: plan!.id },
    }, { onConflict: "external_provider,external_reference" });
    if (entitlementError) throw entitlementError;
  }

  const { error: purchaseError } = await admin.from("platform_purchases").upsert({
    ...purchaseBase,
    status: "paid",
    access_starts_at: accessStartsAt.toISOString(),
    access_expires_at: accessExpiresAt.toISOString(),
    purchased_at: now.toISOString(),
  }, { onConflict: "checkout_session_id" });
  if (purchaseError) throw purchaseError;

  if (customerId) {
    const { error: customerError } = await admin.from("billing_customers").upsert({
      user_id: userId,
      livemode: event.livemode,
      stripe_customer_id: customerId,
      updated_at: now.toISOString(),
    }, { onConflict: "user_id,livemode" });
    if (customerError) throw customerError;
  }
  return { ignored: false, payload: { checkout_session_id: sessionId, product_code: productCode } };
}

async function handleRefund(admin: AdminClient, event: StripeEvent, charge: StripeObject) {
  const paymentIntentId = text(charge.payment_intent);
  const amount = number(charge.amount);
  const amountRefunded = number(charge.amount_refunded);
  if (!paymentIntentId || amountRefunded <= 0 || event.livemode !== configuredForLivePayments()) {
    return { ignored: true, payload: { payment_intent_id: paymentIntentId } };
  }
  const { data: purchase } = await admin
    .from("platform_purchases")
    .select("checkout_session_id,amount_total")
    .eq("payment_intent_id", paymentIntentId)
    .eq("livemode", event.livemode)
    .maybeSingle();
  if (!purchase) return { ignored: true, payload: { payment_intent_id: paymentIntentId } };

  const fullyRefunded = amountRefunded >= amount && amount > 0;
  const now = new Date().toISOString();
  const { error: purchaseError } = await admin.from("platform_purchases").update({
    status: fullyRefunded ? "refunded" : "partially_refunded",
    amount_refunded: Math.min(amountRefunded, purchase.amount_total),
    refunded_at: fullyRefunded ? now : null,
    updated_at: now,
  }).eq("checkout_session_id", purchase.checkout_session_id);
  if (purchaseError) throw purchaseError;
  if (fullyRefunded) {
    const { error: entitlementError } = await admin.from("platform_entitlements").update({ status: "revoked", updated_at: now })
      .eq("external_provider", "stripe")
      .eq("external_reference", purchase.checkout_session_id);
    if (entitlementError) throw entitlementError;
  }
  return { ignored: false, payload: { payment_intent_id: paymentIntentId, full_refund: fullyRefunded } };
}

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature") || "";
  if (!secret || !verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!event.id || !event.type || !event.data?.object) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const supported = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "charge.refunded",
  ]);
  if (!supported.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const { data: existingEvent, error: existingEventError } = await admin.from("payment_events").select("status").eq("provider_event_id", event.id).maybeSingle();
  if (existingEventError) return NextResponse.json({ error: "Payment event lookup failed" }, { status: 500 });
  if (existingEvent?.status === "processed" || existingEvent?.status === "ignored") {
    return NextResponse.json({ received: true });
  }
  const { error: processingError } = await updateEvent(admin, event, "processing", {});
  if (processingError) return NextResponse.json({ error: "Payment event could not be recorded" }, { status: 500 });

  try {
    if (event.type === "checkout.session.async_payment_failed") {
      const sessionId = text(event.data.object.id);
      const { error: purchaseError } = await admin.from("platform_purchases").update({ status: "failed", updated_at: new Date().toISOString() }).eq("checkout_session_id", sessionId);
      if (purchaseError) throw purchaseError;
      const { error: eventError } = await updateEvent(admin, event, "processed", { checkout_session_id: sessionId });
      if (eventError) throw eventError;
      return NextResponse.json({ received: true });
    }
    const result = event.type === "charge.refunded"
      ? await handleRefund(admin, event, event.data.object)
      : await fulfilCheckout(admin, event, event.data.object);
    const { error: eventError } = await updateEvent(admin, event, result.ignored ? "ignored" : "processed", result.payload);
    if (eventError) throw eventError;
    return NextResponse.json({ received: true });
  } catch {
    await updateEvent(admin, event, "failed", {});
    return NextResponse.json({ error: "Payment fulfilment failed" }, { status: 500 });
  }
}
