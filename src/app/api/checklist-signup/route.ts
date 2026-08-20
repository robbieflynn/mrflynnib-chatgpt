import { NextResponse } from "next/server";
import { protectFormRequest, textValue } from "@/lib/request-security";

const courseGroups = {
  "AA HL": "194264072949073276",
  "AA SL": "194264085870675092",
  "AI HL": "194264098118042767",
  "AI SL": "194264136110049031",
} as const;

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export async function POST(request: Request) {
  const securityError = protectFormRequest(request, { namespace: "checklist", limit: 20 });
  if (securityError) return securityError;

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ message: "Thanks." });

  const name = textValue(body, "name", 100);
  const email = normalizeEmail(body.email);
  const course = textValue(body, "course", 10);
  const groupId = courseGroups[course as keyof typeof courseGroups];

  if (!name || name.length < 2 || !email || email.length > 254 || !groupId) {
    return NextResponse.json(
      { message: "Please enter your name, email address and course." },
      { status: 400 },
    );
  }

  const token = process.env.MAILERLITE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { message: "Checklist delivery is being configured. Please try again shortly." },
      { status: 503 },
    );
  }

  const marketingGroupId = process.env.MAILERLITE_MARKETING_GROUP_ID;
  if (!marketingGroupId) {
    return NextResponse.json(
      { message: "Mailing-list signup is being configured. Please try again shortly." },
      { status: 503 },
    );
  }

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
        `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${marketingGroupId}`,
        { method: "DELETE", headers, cache: "no-store" },
      );

      if (!unassignResponse.ok && unassignResponse.status !== 404) {
        console.error("Could not reset checklist delivery group membership", unassignResponse.status);
        return NextResponse.json(
          { message: "We could not resend the checklists. Please try again." },
          { status: 502 },
        );
      }
    }
  } else if (existingResponse.status !== 404) {
    console.error("MailerLite subscriber lookup failed", existingResponse.status, await existingResponse.text());
    return NextResponse.json(
      { message: "We could not add you to the checklist list. Please try again." },
      { status: 502 },
    );
  }

  const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      fields: { name },
      groups: [groupId, marketingGroupId],
      opted_in_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("MailerLite checklist signup failed", response.status, await response.text());
    return NextResponse.json(
      { message: "We could not add you to the checklist list. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: `Thank you. We’ll email all four syllabus checklists to ${email}.`,
  });
}
