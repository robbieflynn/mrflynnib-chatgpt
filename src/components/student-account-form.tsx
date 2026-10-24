"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up" | "reset" | "resend";
type AccessChoice = "free" | "plus";

const ibCourseChoices = [
  { id: "aa-hl", code: "AA HL", title: "Analysis & Approaches Higher Level" },
  { id: "aa-sl", code: "AA SL", title: "Analysis & Approaches Standard Level" },
  { id: "ai-hl", code: "AI HL", title: "Applications & Interpretation Higher Level" },
  { id: "ai-sl", code: "AI SL", title: "Applications & Interpretation Standard Level" },
] as const;

type IbCourseId = (typeof ibCourseChoices)[number]["id"];

function isIbCourseId(value: string | null): value is IbCourseId {
  return ibCourseChoices.some((course) => course.id === value);
}

export function StudentAccountForm({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const curriculum = searchParams.get("qualification") === "igcse" ? "igcse" : "ib";
  const teacherJourney = searchParams.get("next")?.includes("teacher") ?? false;
  const plusJourney = searchParams.get("plan") === "plus" && curriculum === "ib";
  const requestedCourse = searchParams.get("course");
  const requestedNext = searchParams.get("next");
  const nextPath = requestedNext?.startsWith("/")
    ? requestedNext
    : searchParams.get("qualification") === "igcse"
      ? "/account?qualification=igcse"
      : searchParams.get("course")
        ? `/account?course=${encodeURIComponent(searchParams.get("course")!)}`
        : "/account";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"student" | "teacher">(teacherJourney ? "teacher" : "student");
  const [accessChoice, setAccessChoice] = useState<AccessChoice>(plusJourney ? "plus" : "free");
  const [studentCourse, setStudentCourse] = useState<IbCourseId | "">(isIbCourseId(requestedCourse) ? requestedCourse : "");
  const [teacherCourses, setTeacherCourses] = useState<IbCourseId[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNextPath, setConfirmationNextPath] = useState(nextPath);
  const wantsPlus = curriculum === "ib" && accessChoice === "plus";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account/update-password`,
      });
      setPending(false);
      if (resetError) return setError(resetError.message);
      setMessage("Check your email for a password reset link.");
      return;
    }

    if (mode === "resend") {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(confirmationNextPath)}`,
        },
      });
      setPending(false);
      if (resendError) {
        return setError(resendError.message.toLowerCase().includes("rate limit")
          ? "Please wait a minute before requesting another confirmation email."
          : "We could not send a new confirmation email. Please check the address and try again.");
      }
      setMessage("A new confirmation email has been sent. Please check your inbox and spam folder.");
      return;
    }

    if (mode === "sign-up") {
      if (curriculum === "ib" && accountType === "student" && !studentCourse) {
        setPending(false);
        setError("Choose the IB Mathematics course you are studying.");
        return;
      }
      if (curriculum === "ib" && accountType === "teacher" && teacherCourses.length === 0) {
        setPending(false);
        setError("Choose at least one IB Mathematics course that you teach.");
        return;
      }
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim().slice(0, 80);
      const selectedCourses = curriculum === "ib"
        ? accountType === "teacher" ? teacherCourses : [studentCourse]
        : ["igcse"];
      const signUpNextPath = curriculum === "igcse"
        ? "/account?qualification=igcse"
        : accountType === "teacher"
          ? "/teacher"
          : wantsPlus && studentCourse
            ? `/account/access?course=${encodeURIComponent(studentCourse)}`
            : requestedNext?.startsWith("/") && !requestedNext.startsWith("/teacher")
              ? requestedNext
            : `/account?course=${encodeURIComponent(studentCourse)}`;
      setConfirmationNextPath(signUpNextPath);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: displayName,
            account_type: accountType,
            curriculum,
            primary_course: accountType === "student" ? selectedCourses[0] : selectedCourses[0] || null,
            course_preferences: selectedCourses,
            teacher_courses: accountType === "teacher" ? selectedCourses : [],
            access_choice: wantsPlus ? "plus" : "free",
            requested_plan: wantsPlus ? accountType === "teacher" ? "teacher-plus" : "student-plus" : null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(signUpNextPath)}`,
        },
      });
      setPending(false);
      if (signUpError) return setError(signUpError.message);
      if (data.session) {
        router.push(signUpNextPath);
        router.refresh();
      } else {
        setMode("resend");
        setMessage(accountType === "teacher"
          ? wantsPlus
            ? "Check your email to confirm your account. Your teacher access request will then be sent for approval, and Teacher Plus will be available once approved."
            : "Check your email to confirm your account. Your teacher access request will then be sent for approval."
          : "Check your email to confirm your account, then return here to sign in.");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      if (signInError.code === "email_not_confirmed") {
        setMode("resend");
        return setError("Your email address has not been confirmed yet. Send a new confirmation email below.");
      }
      return setError("That email address and password did not match.");
    }
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="account-card stack-lg">
      <div className="account-tabs" role="tablist" aria-label={curriculum === "igcse" ? "IGCSE Mathematics account" : "Mr Flynn IB account"}>
        <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setError(null); setMessage(null); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setError(null); setMessage(null); }}>Create account</button>
      </div>
      <form className="stack" onSubmit={submit}>
        {mode === "sign-up" ? (
          <>
            <fieldset className="account-type-field"><legend>First, who is the account for?</legend><div className="account-type-options">
              <label className={accountType === "student" ? "is-selected" : ""}><input checked={accountType === "student"} name="accountType" onChange={() => { setAccountType("student"); setError(null); }} type="radio" value="student" /><span><strong>Student</strong><small>Choose the one course you are studying.</small></span></label>
              <label className={accountType === "teacher" ? "is-selected" : ""}><input checked={accountType === "teacher"} name="accountType" onChange={() => { setAccountType("teacher"); setError(null); }} type="radio" value="teacher" /><span><strong>Teacher</strong><small>Choose every course you teach. Approval is required.</small></span></label>
            </div></fieldset>
            {curriculum === "ib" ? <fieldset className="account-access-field"><legend>Then, choose your access</legend><p>Free and Plus use the same account. You can upgrade later without losing any saved work.</p><div className="account-access-options">
              <label className={accessChoice === "free" ? "is-selected" : ""}>
                <input checked={accessChoice === "free"} name="accessChoice" onChange={() => { setAccessChoice("free"); setError(null); }} type="radio" value="free" />
                <span><strong>Free account</strong><small>{accountType === "teacher" ? "Classes, assignments and Test Maker" : "Question bank, whiteboards, classes and assignments"}</small></span>
                <b>Free</b>
              </label>
              <label className={accessChoice === "plus" ? "is-selected is-plus" : "is-plus"}>
                <input checked={accessChoice === "plus"} name="accessChoice" onChange={() => { setAccessChoice("plus"); setError(null); }} type="radio" value="plus" />
                <span><strong>{accountType === "teacher" ? "Teacher Plus" : "Mr Flynn IB Plus"}</strong><small>{accountType === "teacher" ? "All four IB courses and their lesson practice" : "Every lesson and its extra practice in one IB course"}</small></span>
                <b>{accountType === "teacher" ? "$99 · 1 year" : "$79 · 2 years"}</b>
              </label>
            </div>{wantsPlus ? <small className="account-access-note">No payment is taken when you create the account. {accountType === "teacher" ? "Teacher approval comes first, then you can activate Teacher Plus." : "Secure checkout follows after your email is confirmed."}</small> : null}</fieldset> : null}
            {curriculum === "ib" ? accountType === "student" ? (
              <fieldset className="account-course-field">
                <legend>Which course are you studying?</legend>
                <p>{wantsPlus
                  ? "Choose the course you want to unlock. Secure payment follows after your account is confirmed."
                  : "This personalises your learning home. You can upgrade the same account later if you choose."}</p>
                <div className="account-course-options is-single">
                  {ibCourseChoices.map((course) => <label className={studentCourse === course.id ? "is-selected" : ""} key={course.id}>
                    <input checked={studentCourse === course.id} name="studentCourse" onChange={() => { setStudentCourse(course.id); setError(null); }} required type="radio" value={course.id} />
                    <span><strong>{course.code}</strong><small>{course.title}</small></span>
                  </label>)}
                </div>
              </fieldset>
            ) : (
              <fieldset className="account-course-field">
                <legend>Which courses do you teach?</legend>
                <p>Choose all that apply. This personalises your setup and does not change paid access.</p>
                <div className="account-course-options is-multiple">
                  {ibCourseChoices.map((course) => {
                    const selected = teacherCourses.includes(course.id);
                    return <label className={selected ? "is-selected" : ""} key={course.id}>
                      <input checked={selected} name="teacherCourses" onChange={() => { setTeacherCourses((current) => selected ? current.filter((id) => id !== course.id) : [...current, course.id]); setError(null); }} type="checkbox" value={course.id} />
                      <span><strong>{course.code}</strong><small>{course.title}</small></span>
                    </label>;
                  })}
                </div>
              </fieldset>
            ) : null}
            <div className="account-name-fields">
              <div className="field">
                <label htmlFor="student-first-name">First name</label>
                <input id="student-first-name" name="firstName" autoComplete="given-name" maxLength={50} required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="student-last-name">Last name</label>
                <input id="student-last-name" name="lastName" autoComplete="family-name" maxLength={50} required value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </div>
            </div>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="student-email">Email address</label>
          <input id="student-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        {mode !== "reset" && mode !== "resend" ? (
          <div className="field">
            <label htmlFor="student-password">Password</label>
            <input id="student-password" name="password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            {mode === "sign-up" ? <small className="muted">Use at least 8 characters.</small> : null}
          </div>
        ) : null}
        {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-message form-success" role="status">{message}</p> : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Please wait…" : mode === "sign-up"
            ? accountType === "teacher"
              ? wantsPlus ? "Create teacher account and request Plus" : "Create my free teacher account"
              : wantsPlus ? "Create account and continue to Plus" : "Create my free account"
            : mode === "reset" ? "Send reset link" : mode === "resend" ? "Resend confirmation email" : plusJourney ? "Sign in and continue" : "Sign in"}
        </button>
      </form>
      {mode === "sign-in" ? <><button className="account-text-button" type="button" onClick={() => { setMode("resend"); setError(null); setMessage(null); }}>Didn&apos;t receive a confirmation email?</button><button className="account-text-button" type="button" onClick={() => { setMode("reset"); setError(null); setMessage(null); }}>Forgotten your password?</button></> : null}
      {mode === "reset" || mode === "resend" ? <button className="account-text-button" type="button" onClick={() => { setMode("sign-in"); setError(null); setMessage(null); }}>Back to sign in</button> : null}
      <p className="small muted">This is a separate {curriculum === "igcse" ? "IGCSE" : "IB"} account area. {mode === "sign-in" && curriculum === "ib" ? "Sign in normally whether your access is Free or Plus. " : "Student accounts save question-bank progress and whiteboard working. Teacher accounts require approval. "}Creating an account does not subscribe you to marketing emails.</p>
      <p className="small muted">By creating an account, you agree to the <Link className="text-link" href="/terms">Terms of Use</Link> and acknowledge the <Link className="text-link" href="/privacy">Privacy Policy</Link>.</p>
    </div>
  );
}
