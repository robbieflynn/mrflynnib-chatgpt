import { NextResponse } from "next/server";

const allowedKinds = new Set(["contact", "tutoring", "school"]);
const schoolEnquiryGroupId = "194431035036927513";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
        courses_or_year_groups: optionalText(body, "coursesNeeded"),
        school_enquiry_message: optionalText(body, "message"),
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

  if (body.kind === "school") {
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
