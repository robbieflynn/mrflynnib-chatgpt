"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Mode = "sign-in" | "sign-up";
type CourseCount = { course: string; count: number };

function readableAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "That email and password do not match.";
  if (lower.includes("user already registered")) return "An account already exists for that email. Try signing in instead.";
  if (lower.includes("password")) return "Please use a password with at least 8 characters.";
  return "We could not complete that request. Please try again.";
}

export function AccountPanel({ initialError, nextPath }: { initialError?: string; nextPath: string }) {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");
  const [messageType, setMessageType] = useState<"success" | "error">(initialError ? "error" : "success");
  const [courseCounts, setCourseCounts] = useState<CourseCount[]>([]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    const loadAccount = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    };

    void loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setCourseCounts([]);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;

    let active = true;
    void supabase
      .from("question_progress")
      .select("course")
      .then(({ data, error }) => {
        if (!active || error) return;
        const counts = new Map<string, number>();
        for (const row of data ?? []) {
          const course = typeof row.course === "string" ? row.course : "Other";
          counts.set(course, (counts.get(course) ?? 0) + 1);
        }
        setCourseCounts(Array.from(counts, ([course, count]) => ({ course, count })));
      });

    return () => { active = false; };
  }, [supabase, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setSubmitting(true);
    setMessage("");

    if (mode === "sign-up") {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", nextPath);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      setSubmitting(false);

      if (error) {
        setMessageType("error");
        setMessage(readableAuthError(error.message));
        return;
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setMessageType("success");
      setMessage("Check your email and click the confirmation link to finish creating your account.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setMessageType("error");
      setMessage(readableAuthError(error.message));
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  async function sendPasswordReset(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const email = form?.elements.namedItem("email");
    const address = email instanceof HTMLInputElement ? email.value.trim() : "";
    if (!address || !supabase) {
      setMessageType("error");
      setMessage("Enter your email address first, then choose “Forgot password?”.");
      return;
    }

    setSubmitting(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/account/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: callback.toString() });
    setSubmitting(false);
    setMessageType(error ? "error" : "success");
    setMessage(error ? readableAuthError(error.message) : "If an account exists for that email, a password-reset link is on its way.");
  }

  async function signOut() {
    if (!supabase) return;
    setSubmitting(true);
    await supabase.auth.signOut();
    setSubmitting(false);
    setMessage("");
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="account-card stack-lg">
        <span className="account-kicker">Preview foundation</span>
        <h2>Student accounts are ready to connect.</h2>
        <p className="muted">The account screens and saved-progress system are in place. Supabase needs to be connected before sign-up can be tested on the preview.</p>
        <Link className="button" href="/question-bank">Continue to the question bank</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="account-card"><p className="muted">Checking your account…</p></div>;
  }

  if (user) {
    const total = courseCounts.reduce((sum, item) => sum + item.count, 0);
    return (
      <div className="account-card stack-lg">
        <div className="stack">
          <span className="account-kicker">Signed in</span>
          <h2>Your question bank progress.</h2>
          <p className="muted">{user.email}</p>
        </div>
        <div className="account-progress-summary">
          <strong>{total}</strong>
          <span>{total === 1 ? "question saved as correct" : "questions saved as correct"}</span>
        </div>
        {courseCounts.length > 0 && (
          <div className="account-course-counts">
            {courseCounts.map((item) => <span key={item.course}><strong>{item.course}</strong>{item.count}</span>)}
          </div>
        )}
        <div className="cluster">
          <Link className="button" href="/question-bank">Open question bank</Link>
          <button className="button button-secondary" disabled={submitting} onClick={signOut} type="button">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-card stack-lg">
      <div className="account-tabs" role="tablist" aria-label="Account access">
        <button aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setMessage(""); }} role="tab" type="button">Sign in</button>
        <button aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setMessage(""); }} role="tab" type="button">Create account</button>
      </div>
      <div className="stack">
        <span className="account-kicker">Free question bank account</span>
        <h2>{mode === "sign-in" ? "Welcome back." : "Save your progress."}</h2>
        <p className="muted">{mode === "sign-in" ? "Sign in to see the questions you have already got right." : "Create an account to save correct questions across your devices. This does not subscribe you to marketing emails."}</p>
      </div>
      <form className="account-form stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} name="password" required type="password" />
          {mode === "sign-up" && <small className="muted">Use at least 8 characters.</small>}
        </label>
        {message && <p aria-live="polite" className={`form-message form-${messageType}`}>{message}</p>}
        <button className="button" disabled={submitting} type="submit">{submitting ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create free account"}</button>
        {mode === "sign-in" && <button className="account-text-button" disabled={submitting} onClick={sendPasswordReset} type="button">Forgot password?</button>}
      </form>
    </div>
  );
}
