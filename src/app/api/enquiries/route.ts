import { NextResponse } from "next/server";
import { protectFormRequest, textValue } from "@/lib/request-security";

const allowedKinds = new Set(["contact", "tutoring", "school"]);
const allowedCurricula = new Set(["IB Mathematics", "IGCSE Mathematics"]);

function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optionalText(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "Not provided";
}

async function sendSchoolEnquiry(body: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.SCHOOL_ENQUIRY_FROM_EMAIL ?? "Mr Flynn IB Website <website@mrflynnib.com>";
  const recipient = process.env.SCHOOL_ENQUIRY_TO_EMAIL ?? "contact@mrflynnib.com";

  if (!apiKey) return false;

  const email = String(body.email).trim().toLowerCase();
  const schoolName = String(body.schoolName).trim();
  const curriculum = optionalText(body, "curriculum");
  const messageBody = [
    `A new ${curriculum} school enquiry was submitted on mrflynnib.com.`,
    "",
    `Name: ${String(body.name).trim()}`,
    `Email: ${email}`,
    `Role: ${optionalText(body, "role")}`,
    `School: ${schoolName}`,
    `Country: ${optionalText(body, "country")}`,
    `Estimated students: ${optionalText(body, "studentCount")}`,
    `Courses or year groups: ${optionalText(body, "coursesNeeded")}`,
    `Curriculum: ${curriculum}`,
    "",
    "Other information:",
    optionalText(body, "message"),
    "",
    `Submitted: ${new Date().toISOString()}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      reply_to: email,
      subject: `New ${curriculum} school enquiry: ${schoolName}`,
      text: messageBody,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Resend school enquiry email failed", response.status);
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  const securityError = protectFormRequest(request, { namespace: "enquiry", limit: 10 });
  if (securityError) return securityError;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ message: "Thanks." });

  const kind = textValue(body, "kind", 20);
  const name = textValue(body, "name", 100);
  const email = textValue(body, "email", 254).toLowerCase();
  const message = textValue(body, "message", 5_000);

  const messageTooLong = typeof body.message === "string" && body.message.trim().length > 5_000;
  if (!allowedKinds.has(kind) || name.length < 2 || !isEmail(email) || typeof body.message !== "string" || messageTooLong || (kind !== "school" && !message)) {
    return NextResponse.json({ message: "Please complete the required fields." }, { status: 400 });
  }

  if (kind === "school") {
    const role = textValue(body, "role", 150);
    const schoolName = textValue(body, "schoolName", 200);
    const country = textValue(body, "country", 100);
    const studentCount = Number(textValue(body, "studentCount", 6));
    const coursesNeeded = textValue(body, "coursesNeeded", 500);
    const curriculum = textValue(body, "curriculum", 50);

    if (!role || !schoolName || !country || !Number.isInteger(studentCount) || studentCount < 1 || studentCount > 10_000 || !allowedCurricula.has(curriculum) || (body.coursesNeeded && !coursesNeeded)) {
      return NextResponse.json({ message: "Please complete the required school details." }, { status: 400 });
    }
  }

  const record = {
    kind,
    name,
    email,
    message,
    payload: body,
    status: "new",
    source: "website",
  };

  if (kind === "school") {
    if (!(await sendSchoolEnquiry(body))) {
      return NextResponse.json(
        { message: "We could not send your enquiry. Please email contact@mrflynnib.com." },
        { status: 502 },
      );
    }
  } else {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      if (process.env.NODE_ENV !== "production") {
        console.info("Preview enquiry:", record);
        return NextResponse.json({ message: "Preview mode: the form works, but Supabase must be configured before launch." });
      }
      return NextResponse.json({ message: "We could not send your enquiry. Please email contact@mrflynnib.com." }, { status: 502 });
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
  }

  return NextResponse.json({ message: "Thanks. Your enquiry has been received. We’ll be in touch." });
}
