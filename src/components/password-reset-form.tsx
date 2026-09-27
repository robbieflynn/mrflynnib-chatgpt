"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function PasswordResetForm() {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    setSuccess(!error);
    setMessage(error ? "That reset link may have expired. Request a new link from the sign-in page." : "Your password has been updated.");
  }

  return (
    <div className="account-card stack-lg">
      <span className="account-kicker">Question bank account</span>
      <h2>Choose a new password.</h2>
      {!configured ? <p className="form-message form-error">Account access is not configured on this preview.</p> : success ? (
        <div className="stack">
          <p className="form-message form-success">{message}</p>
          <Link className="button" href="/account">Return to your account</Link>
        </div>
      ) : (
        <form className="account-form stack" onSubmit={updatePassword}>
          <label className="field">
            <span>New password</span>
            <input autoComplete="new-password" minLength={8} name="password" required type="password" />
            <small className="muted">Use at least 8 characters.</small>
          </label>
          {message && <p className="form-message form-error">{message}</p>}
          <button className="button" disabled={submitting} type="submit">{submitting ? "Updating…" : "Update password"}</button>
        </form>
      )}
    </div>
  );
}
