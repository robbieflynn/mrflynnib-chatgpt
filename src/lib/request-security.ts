import { NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };
type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimit = globalThis as typeof globalThis & {
  mrFlynnRateLimit?: RateLimitStore;
};

const rateLimitStore = globalRateLimit.mrFlynnRateLimit ?? new Map<string, RateLimitEntry>();
globalRateLimit.mrFlynnRateLimit = rateLimitStore;

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

export function protectFormRequest(
  request: Request,
  { namespace, limit, windowMs = 10 * 60 * 1000 }: { namespace: string; limit: number; windowMs?: number },
) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "Invalid request." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 12_000) {
    return NextResponse.json({ message: "Request too large." }, { status: 413 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  const now = Date.now();
  const key = `${namespace}:${clientAddress(request)}`;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { message: "Too many requests. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  current.count += 1;
  return null;
}

export function textValue(body: Record<string, unknown>, key: string, maximumLength: number) {
  const value = body[key];
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length <= maximumLength ? trimmed : "";
}
