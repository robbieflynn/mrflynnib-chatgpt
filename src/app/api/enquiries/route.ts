import { NextResponse } from "next/server";

const allowedKinds = new Set(["contact", "tutoring", "school"]);

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ message: "Thanks." });
  if (!allowedKinds.has(String(body.kind)) || typeof body.name !== "string" || !isEmail(body.email) || typeof body.message !== "string") {
    return NextResponse.json({ message: "Please complete the required fields." }, { status: 400 });
  }

  const record = {
    kind: body.kind,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    message: body.message.trim(),
    payload: body,
    status: "new",
    source: "website",
  };

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Preview enquiry:", record);
      return NextResponse.json({ message: "Preview mode: the form works, but Supabase must be configured before launch." });
    }
    return NextResponse.json({ message: "The enquiry service is being configured. Please email hello@mrflynnib.com." }, { status: 503 });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/enquiries`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Supabase enquiry insert failed", response.status, await response.text());
    return NextResponse.json({ message: "We could not send your enquiry. Please email hello@mrflynnib.com." }, { status: 502 });
  }

  return NextResponse.json({ message: "Thanks — your enquiry has been received. We’ll be in touch." });
}
