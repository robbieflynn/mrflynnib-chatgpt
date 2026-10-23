import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct } from "@/lib/platform-products";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLiveMode() {
  return process.env.STRIPE_MODE === "live";
}

function stripeConfiguration() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const live = isLiveMode();
  if (!secret || (live ? !secret.startsWith("sk_live_") : !secret.startsWith("sk_test_"))) return null;
  return { secret, live };
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin && suppliedOrigin !== requestOrigin) {
    return NextResponse.json({ error: "Checkout request was rejected." }, { status: 403 });
  }

  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const product = getCourseProduct(typeof body.courseId === "string" ? body.courseId : "");
  if (!product || product.curriculum !== session.curriculum) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }
  if (session.ownedCourses.some((course) => course.id === product.id)) {
    return NextResponse.json({ url: product.curriculum === "igcse" ? "/igcse/learn" : "/learn" });
  }
  if (!session.user.email) {
    return NextResponse.json({ error: "Your account needs an email address before checkout can start." }, { status: 400 });
  }

  const stripe = stripeConfiguration();
  const price = process.env[product.stripePriceEnv];
  if (!stripe || !price?.startsWith("price_")) {
    return NextResponse.json({ error: "Checkout is not configured in this preview yet." }, { status: 503 });
  }

  const requestId = typeof body.requestId === "string" && UUID_PATTERN.test(body.requestId)
    ? body.requestId
    : randomUUID();
  const admin = createAdminClient();
  const { data: billingCustomer } = await admin
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", session.user.id)
    .eq("livemode", stripe.live)
    .maybeSingle();

  const accessPath = product.curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const successUrl = new URL(accessPath, requestOrigin);
  successUrl.searchParams.set("checkout", "success");
  successUrl.searchParams.set("course", product.id);
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancelUrl = new URL(accessPath, requestOrigin);
  cancelUrl.searchParams.set("checkout", "cancelled");
  cancelUrl.searchParams.set("course", product.id);

  const params = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    allow_promotion_codes: "true",
    client_reference_id: session.user.id,
    "metadata[user_id]": session.user.id,
    "metadata[product_code]": product.productCode,
    "metadata[curriculum]": product.curriculum,
    "payment_intent_data[metadata][user_id]": session.user.id,
    "payment_intent_data[metadata][product_code]": product.productCode,
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  });
  if (billingCustomer?.stripe_customer_id) {
    params.set("customer", billingCustomer.stripe_customer_id);
  } else {
    params.set("customer_email", session.user.email);
    params.set("customer_creation", "always");
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripe.secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `checkout:${session.user.id}:${product.productCode}:${requestId}`,
    },
    body: params,
    cache: "no-store",
  });
  const checkout = await response.json().catch(() => ({}));
  if (!response.ok || typeof checkout.url !== "string") {
    return NextResponse.json({ error: "Checkout could not be started. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ url: checkout.url }, { headers: { "Cache-Control": "private, no-store" } });
}
