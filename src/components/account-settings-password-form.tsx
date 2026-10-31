"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountSettingsPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmation("");
    setSuccess("Your password has been updated.");
  }

  return (
    <form className="account-settings-password stack" onSubmit={submit}>
      <div className="stack-xs">
        <p className="eyebrow">Password</p>
        <h2>Change your password</h2>
        <p className="muted">Choose a password you do not use on another website.</p>
      </div>
      <div className="field">
        <label htmlFor="account-new-password">New password</label>
        <input id="account-new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <small className="muted">Use at least 8 characters.</small>
      </div>
      <div className="field">
        <label htmlFor="account-confirm-password">Confirm new password</label>
        <input id="account-confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {success ? <p className="form-message form-success" role="status">{success}</p> : null}
      <div><button className="button" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button></div>
    </form>
  );
}
