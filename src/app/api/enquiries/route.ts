import { NextResponse } from "next/server";

const allowedKinds = new Set(["contact", "tutoring", "school"]);

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optionalText(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "Not provided";
}

async function sendSchoolEnquiryNotification(body: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ENQUIRY_FROM_EMAIL;
  const to = process.env.ENQUIRY_NOTIFICATION_EMAIL ?? "contact@mrflynnib.com";

  if (!apiKey || !from) {
    console.warn("School enquiry saved without email notification. Configure RESEND_API_KEY and ENQUIRY_FROM_EMAIL before launch.");
    return;
  }

  const schoolName = optionalText(body, "schoolName");
  const email = optionalText(body, "email");
  const notification = [
    "A new school licence enquiry has been submitted.",
    "",
    `Name: ${optionalText(body, "name")}`,
    `Email: ${email}`,
    `Role: ${optionalText(body, "role")}`,
    `School: ${schoolName}`,
    `Country: ${optionalText(body, "country")}`,
    `Estimated student count: ${optionalText(body, "studentCount")}`,
    `Courses or year groups: ${optionalText(body, "coursesNeeded")}`,
    `Other information: ${optionalText(body, "message")}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "MrFlynnIB-Website/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `School licence enquiry: ${schoolName}`,
      text: notification,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("School enquiry email notification failed", response.status, await response.text());
  }
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
    return NextResponse.json({ message: "The enquiry service is being configured. Please email contact@mrflynnib.com." }, { status: 503 });
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
    return NextResponse.json({ message: "We could not send your enquiry. Please email contact@mrflynnib.com." }, { status: 502 });
  }

  if (body.kind === "school") await sendSchoolEnquiryNotification(body);

  return NextResponse.json({ message: "Thanks. Your enquiry has been received. We’ll be in touch." });
}
