"use client";

import { useState } from "react";

export function CourseCheckoutButton({ courseId }: { courseId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/platform/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not be started.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setBusy(false);
    }
  }
  return <div className="stack-sm"><button className="button" type="button" disabled={busy} onClick={startCheckout}>{busy ? "Opening secure checkout…" : "Buy one year for $69"}</button>{error ? <p className="form-message form-error">{error}</p> : null}</div>;
}
