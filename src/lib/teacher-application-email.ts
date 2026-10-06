export async function sendTeacherApplicationEmail({ name, email }: { name: string; email: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const sender = process.env.SCHOOL_ENQUIRY_FROM_EMAIL ?? "Mr Flynn IB Website <website@mrflynnib.com>";
  const recipient = process.env.SCHOOL_ENQUIRY_TO_EMAIL ?? "contact@mrflynnib.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `Teacher account approval requested: ${name || email}`,
      text: [
        "A teacher has confirmed their email address and requested access to the Mr Flynn IB teacher platform.",
        "",
        `Name: ${name || "Not provided"}`,
        `Email: ${email}`,
        `Requested: ${new Date().toISOString()}`,
        "",
        "Sign in to your Mr Flynn IB teacher dashboard to approve or decline the request.",
      ].join("\n"),
    }),
    cache: "no-store",
  });
  if (!response.ok) console.error("Resend teacher application email failed", response.status);
  return response.ok;
}
