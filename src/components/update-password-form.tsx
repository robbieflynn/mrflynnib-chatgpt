"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (updateError) return setError(updateError.message);
    router.push("/account");
    router.refresh();
  }

  return (
    <form className="account-card stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <small className="muted">Use at least 8 characters.</small>
      </div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
