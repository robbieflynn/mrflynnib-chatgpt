"use client";

import { useState } from "react";
import Link from "next/link";
import type { TrialState } from "@/lib/platform-trials";

export function PlusTrialOffer({ state, courseId, productId }: { state?: TrialState; courseId?: string; productId?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!state) return null;
  const trial = state.trial;
  const active = state.active;
  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/platform/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, productId }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Your trial could not be started.");
      window.location.assign(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); setBusy(false); }
  }
  if (trial) return <div className="plus-trial-offer" role="status"><strong>{active ? "Your free trial is active" : "Your free trial has ended"}</strong><p>{active ? `Ends ${new Date(trial.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}. Choose a paid plan whenever you’re ready.` : "Choose a Plus plan to continue. Your progress and saved work are kept."}</p>{active ? <Link className="text-link" href={trial.product_code === "teacher_plus_ib" ? "/learn?view=courses" : `/learn?course=${trial.product_code.slice(10).replaceAll("_", "-")}`}>Open trial courses →</Link> : null}<small>You won’t be charged automatically.</small></div>;
  if (!state.available) return null;
  return <div className="plus-trial-offer"><strong>Try Plus free for 7 days</strong><p>{productId === "teacher-plus" ? "Explore all four IB courses." : "Explore the complete selected course."}</p><button className="button button-secondary" disabled={busy} onClick={start} type="button">{busy ? "Starting your trial…" : "Start 7-day free trial"}</button><small>No card required. Ends automatically.</small>{error ? <p className="form-message form-error" role="alert">{error}</p> : null}</div>;
}
