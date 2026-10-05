"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up" | "reset";

export function StudentAccountForm({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestedNext = searchParams.get("next");
  const nextPath = requestedNext?.startsWith("/")
    ? requestedNext
    : searchParams.get("qualification") === "igcse"
      ? "/account?qualification=igcse"
      : searchParams.get("course")
        ? `/account?course=${encodeURIComponent(searchParams.get("course")!)}`
        : "/account";

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

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      setPending(false);
      if (signUpError) return setError(signUpError.message);
      if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then return here to sign in.");
      }
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) return setError("That email address and password did not match.");
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="account-card stack-lg">
      <div className="account-tabs" role="tablist" aria-label="Student account">
        <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setError(null); setMessage(null); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setError(null); setMessage(null); }}>Create account</button>
      </div>
      <form className="stack" onSubmit={submit}>
        {mode === "sign-up" ? (
          <div className="field">
            <label htmlFor="student-name">First name</label>
            <input id="student-name" name="name" autoComplete="given-name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="student-email">Email address</label>
          <input id="student-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        {mode !== "reset" ? (
          <div className="field">
            <label htmlFor="student-password">Password</label>
            <input id="student-password" name="password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            {mode === "sign-up" ? <small className="muted">Use at least 8 characters.</small> : null}
          </div>
        ) : null}
        {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-message form-success" role="status">{message}</p> : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Please wait…" : mode === "sign-up" ? "Create my account" : mode === "reset" ? "Send reset link" : "Sign in"}
        </button>
      </form>
      {mode === "sign-in" ? <button className="account-text-button" type="button" onClick={() => { setMode("reset"); setError(null); setMessage(null); }}>Forgotten your password?</button> : null}
      {mode === "reset" ? <button className="account-text-button" type="button" onClick={() => { setMode("sign-in"); setError(null); setMessage(null); }}>Back to sign in</button> : null}
      <p className="small muted">Creating an account saves question-bank progress and whiteboard working. It does not subscribe you to marketing emails.</p>
      <p className="small muted">By creating an account, you agree to the <Link className="text-link" href="/terms">Terms of Use</Link> and acknowledge the <Link className="text-link" href="/privacy">Privacy Policy</Link>.</p>
    </div>
  );
}
