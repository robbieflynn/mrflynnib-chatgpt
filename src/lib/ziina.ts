import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const ZIINA_API_BASE = "https://api-v2.ziina.com/api";
const ZIINA_WEBHOOK_IPS = new Set([
  "3.29.184.186",
  "3.29.190.95",
  "20.233.47.127",
  "13.202.161.181",
]);

export type ZiinaPaymentStatus =
  | "requires_payment_instrument"
  | "requires_user_action"
  | "pending"
  | "completed"
  | "failed"
  | "canceled";

export type ZiinaPaymentIntent = {
  id: string;
  account_id: string;
  amount: number;
  currency_code: string;
  status: ZiinaPaymentStatus;
  operation_id: string;
  redirect_url?: string;
  embedded_url?: string;
  message?: string;
};

function ziinaToken() {
  const token = process.env.ZIINA_ACCESS_TOKEN;
  if (!token) throw new Error("Ziina is not configured yet.");
  return token;
}

async function ziinaRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${ZIINA_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${ziinaToken()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Ziina request failed", response.status, payload);
    throw new Error("The secure payment service is temporarily unavailable.");
  }
  return payload;
}

export function isZiinaTestMode() {
  return process.env.ZIINA_TEST_MODE !== "false";
}

export async function createZiinaPaymentIntent(input: {
  amount: number;
  currencyCode: "USD";
  message: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
}) {
  return ziinaRequest("/payment_intent", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency_code: input.currencyCode,
      message: input.message,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      failure_url: input.failureUrl,
      test: isZiinaTestMode(),
      expiry: String(Date.now() + 30 * 60 * 1000),
      allow_tips: false,
    }),
  }) as Promise<ZiinaPaymentIntent>;
}

export async function getZiinaPaymentIntent(id: string) {
  return ziinaRequest(`/payment_intent/${encodeURIComponent(id)}`) as Promise<ZiinaPaymentIntent>;
}

export function verifyZiinaWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.ZIINA_WEBHOOK_SECRET;
  if (!secret || !signature || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function isAllowedZiinaWebhookSource(forwardedFor: string | null) {
  if (!forwardedFor) return false;
  return forwardedFor
    .split(",")
    .map((value) => value.trim().replace(/^::ffff:/, ""))
    .some((value) => ZIINA_WEBHOOK_IPS.has(value));
}
