"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ChecklistSignup() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/checklist-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Please try again.");
      setStatus("success");
      setMessage(result.message ?? "Thank you. We’ll email all four syllabus checklists.");
      form.reset();
      const course = String(payload.course).toLowerCase().replace(" ", "-");
      router.push(`/thanks/checklist-${course}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form className="checklist-form" onSubmit={onSubmit} aria-busy={status === "sending"}>
      <input className="hp-field" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="field">
        <label htmlFor="checklist-name">First name</label>
        <input id="checklist-name" name="name" required autoComplete="given-name" />
      </div>
      <div className="field">
        <label htmlFor="checklist-email">Email address</label>
        <input id="checklist-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="checklist-course">Your course</label>
        <select id="checklist-course" name="course" required defaultValue="">
          <option value="" disabled>Select one</option>
          <option>AA HL</option>
          <option>AA SL</option>
          <option>AI HL</option>
          <option>AI SL</option>
        </select>
      </div>
      <button className="button" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send all four checklists and subscribe"}
      </button>
      <p className="checklist-consent-note">You’ll receive all four syllabus checklists plus occasional IB Mathematics resources and course updates from Mr Flynn IB. Unsubscribe anytime.</p>
      <p className="checklist-privacy">By clicking the button, you agree to receive these emails. See our <Link href="/privacy">privacy policy</Link>.</p>
      {message && <p role={status === "error" ? "alert" : "status"} className={`form-message checklist-message ${status === "success" ? "form-success" : "form-error"}`}>{message}</p>}
    </form>
  );
}
