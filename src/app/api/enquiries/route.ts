import { NextResponse } from "next/server";
import { protectFormRequest, textValue } from "@/lib/request-security";

const allowedKinds = new Set(["contact", "tutoring", "school"]);
const schoolEnquiryGroupId = "194431035036927513";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optionalText(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "Not provided";
}

async function submitSchoolEnquiry(body: Record<string, unknown>, token: string) {
  const email = String(body.email).trim().toLowerCase();
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const existingResponse = await fetch(
    `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}?include=groups`,
    { headers, cache: "no-store" },
  );

  if (existingResponse.ok) {
    const existing = (await existingResponse.json()) as { data?: { id?: string } };
    const subscriberId = existing.data?.id;

    if (subscriberId) {
      const unassignResponse = await fetch(
        `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${schoolEnquiryGroupId}`,
        { method: "DELETE", headers, cache: "no-store" },
      );

      if (!unassignResponse.ok && unassignResponse.status !== 404) {
        console.warn("Could not reset existing school enquiry group membership", unassignResponse.status);
      }
    }
  } else if (existingResponse.status !== 404) {
    console.error("MailerLite subscriber lookup failed", existingResponse.status, await existingResponse.text());
    return false;
  }

  const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      fields: {
        name: String(body.name).trim(),
        company: optionalText(body, "schoolName"),
        country: optionalText(body, "country"),
        school_role: optionalText(body, "role"),
        estimated_students: optionalText(body, "studentCount"),
        courses_or_year_groups: `${optionalText(body, "curriculum")}: ${optionalText(body, "coursesNeeded")}`,
        school_enquiry_message: `${optionalText(body, "curriculum")} enquiry. ${optionalText(body, "message")}`,
      },
      groups: [schoolEnquiryGroupId],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("MailerLite school enquiry failed", response.status, await response.text());
    return false;
  }

  const result = (await response.json()) as { data?: { status?: string } };
  return result.data?.status === "active";
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

    if (!role || !schoolName || !country || !Number.isInteger(studentCount) || studentCount < 1 || studentCount > 10_000 || (body.coursesNeeded && !coursesNeeded)) {
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
    const token = process.env.MAILERLITE_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        { message: "The school enquiry form is being configured. Please email contact@mrflynnib.com." },
        { status: 503 },
      );
    }

    if (!(await submitSchoolEnquiry(body, token))) {
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
