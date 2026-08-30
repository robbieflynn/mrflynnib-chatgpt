"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "contact" | "tutoring" | "school";

export function EnquiryForm({ kind, curriculum = "IB Mathematics" }: { kind: Kind; curriculum?: "IB Mathematics" | "IGCSE Mathematics" }) {
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
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, kind, curriculum }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Please try again.");
      setStatus("success");
      setMessage(result.message ?? "Thanks. Your enquiry has been received.");
      form.reset();
      if (kind === "school") router.push("/thanks/school-enquiry");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form className="card stack-lg" onSubmit={onSubmit} aria-busy={status === "sending"}>
      <input className="hp-field" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="form-grid">
        <div className="field"><label htmlFor={`${kind}-name`}>Your name</label><input id={`${kind}-name`} name="name" required autoComplete="name" /></div>
        <div className="field"><label htmlFor={`${kind}-email`}>Email address</label><input id={`${kind}-email`} name="email" type="email" required autoComplete="email" /></div>

        {kind === "tutoring" && <>
          <div className="field"><label htmlFor="studentName">Student name</label><input id="studentName" name="studentName" required /></div>
          <div className="field"><label htmlFor="school">School</label><input id="school" name="school" /></div>
          <div className="field"><label htmlFor="course">IB Mathematics course</label><select id="course" name="course" required defaultValue=""><option value="" disabled>Select one</option><option>AA HL</option><option>AA SL</option><option>AI HL</option><option>AI SL</option><option>Not sure</option></select></div>
          <div className="field"><label htmlFor="timezone">Country and time zone</label><input id="timezone" name="timezone" required /></div>
          <div className="field"><label htmlFor="currentGrade">Current grade</label><input id="currentGrade" name="currentGrade" /></div>
          <div className="field"><label htmlFor="targetGrade">Target grade</label><input id="targetGrade" name="targetGrade" /></div>
          <div className="field"><label htmlFor="examDate">Exam session</label><input id="examDate" name="examDate" placeholder="For example, May 2027" /></div>
          <div className="field"><label htmlFor="availability">Preferred lesson times</label><input id="availability" name="availability" /></div>
        </>}

        {kind === "school" && <>
          <div className="field"><label htmlFor="role">Your role</label><input id="role" name="role" required placeholder="Head of Mathematics, Curriculum Lead…" /></div>
          <div className="field"><label htmlFor="schoolName">School name</label><input id="schoolName" name="schoolName" required /></div>
          <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" required /></div>
          <div className="field"><label htmlFor="studentCount">Estimated student count</label><input id="studentCount" name="studentCount" type="number" min="1" required /></div>
          <div className="field field-full"><label htmlFor={`${kind}-coursesNeeded`}>Courses or year groups needed</label><input id={`${kind}-coursesNeeded`} name="coursesNeeded" placeholder={curriculum === "IGCSE Mathematics" ? "For example, Year 10 and Year 11" : "For example, AA HL and AA SL, Years 1–2"} /></div>
        </>}

        {kind === "contact" && <div className="field field-full"><label htmlFor="topic">What can we help with?</label><select id="topic" name="topic" defaultValue="General enquiry"><option>General enquiry</option><option>Course access</option><option>Book</option><option>Tutoring</option><option>School licence</option><option>Media or partnership</option></select></div>}

        <div className="field field-full"><label htmlFor={`${kind}-message`}>{kind === "tutoring" ? "What is the student finding difficult?" : kind === "school" ? "Any other information (optional)" : "Message"}</label><textarea id={`${kind}-message`} name="message" required={kind !== "school"} /></div>
      </div>
      <div className="cluster">
        <button className="button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : kind === "school" ? "Request school information" : kind === "tutoring" ? "Submit tutoring application" : "Send enquiry"}</button>
        <p className="small muted">By submitting, you agree to the privacy policy.</p>
      </div>
      {message && <p role={status === "error" ? "alert" : "status"} className={`form-message ${status === "success" ? "form-success" : "form-error"}`}>{message}</p>}
    </form>
  );
}
