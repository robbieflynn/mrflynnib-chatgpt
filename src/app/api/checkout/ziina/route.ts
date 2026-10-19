import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCoursePurchase } from "@/lib/course-payments";
import { protectFormRequest } from "@/lib/request-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createZiinaPaymentIntent, isZiinaTestMode } from "@/lib/ziina";

export async function POST(request: Request) {
  const securityError = protectFormRequest(request, { namespace: "ziina-checkout", limit: 10 });
  if (securityError) return securityError;

  let body: { course?: unknown; plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid checkout request." }, { status: 400 });
  }

  if (typeof body.course !== "string" || typeof body.plan !== "string") {
    return NextResponse.json({ message: "Choose a valid course and access plan." }, { status: 400 });
  }

  const purchase = getCoursePurchase(body.course, body.plan);
  if (!purchase) {
    return NextResponse.json({ message: "Choose a valid course and access plan." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Please sign in before purchasing course access." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,curriculum")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.curriculum === "igcse") {
    return NextResponse.json({ message: "Please use an IB account to purchase an IB course." }, { status: 403 });
  }

  const orderId = randomUUID();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const completionUrl = new URL("/courses/checkout/complete", siteUrl);
  completionUrl.searchParams.set("order", orderId);
  const admin = createAdminClient();
  const isTest = isZiinaTestMode();

  const { error: insertError } = await admin.from("checkout_orders").insert({
    id: orderId,
    user_id: user.id,
    customer_email: user.email ?? "",
    course_code: purchase.course.shortTitle,
    course_slug: purchase.course.slug,
    plan_code: purchase.plan.id,
    access_months: purchase.plan.durationMonths,
    amount: purchase.amountInBaseUnits,
    currency_code: purchase.currency,
    status: "creating",
    is_test: isTest,
  });

  if (insertError) {
    console.error("Could not create checkout order", insertError.code);
    return NextResponse.json({ message: "Checkout could not be started. Please try again." }, { status: 502 });
  }

  try {
    const intent = await createZiinaPaymentIntent({
      amount: purchase.amountInBaseUnits,
      currencyCode: purchase.currency,
      message: `Mr Flynn IB ${purchase.course.shortTitle} — ${purchase.plan.duration} access`,
      successUrl: completionUrl.toString(),
      cancelUrl: `${completionUrl.toString()}&result=canceled`,
      failureUrl: `${completionUrl.toString()}&result=failed`,
    });

    if (!intent.id || !intent.redirect_url) throw new Error("Ziina did not return a hosted checkout URL.");

    const { error: updateError } = await admin
      .from("checkout_orders")
      .update({
        ziina_payment_intent_id: intent.id,
        ziina_operation_id: intent.operation_id,
        status: intent.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (updateError) throw updateError;

    return NextResponse.json({ redirectUrl: intent.redirect_url, orderId });
  } catch (error) {
    console.error("Ziina checkout creation failed", error);
    await admin
      .from("checkout_orders")
      .update({ status: "creation_failed", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Checkout could not be started." },
      { status: 502 },
    );
  }
}
