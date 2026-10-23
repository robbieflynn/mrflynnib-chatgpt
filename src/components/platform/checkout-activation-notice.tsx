"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CheckoutActivationNotice({ sessionId, accessPath }: { sessionId: string; accessPath: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(sessionId.startsWith("cs_")
    ? "Payment complete. Activating your course access…"
    : "Checkout completed. Refresh this page shortly to see your course access.");

  useEffect(() => {
    if (!sessionId.startsWith("cs_")) return;
    let cancelled = false;
    async function waitForAccess() {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const response = await fetch(`/api/platform/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).catch(() => null);
        const result = response ? await response.json().catch(() => ({})) : {};
        if (result.status === "active") {
          setMessage("Your course is ready.");
          router.replace(accessPath);
          router.refresh();
          return;
        }
        if (result.status === "failed" || result.status === "refunded") {
          setMessage("We could not activate this payment. Please contact support and we will help.");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!cancelled) setMessage("Payment complete. Activation is taking a little longer than usual; it will continue automatically.");
    }
    void waitForAccess();
    return () => { cancelled = true; };
  }, [accessPath, router, sessionId]);

  return <p className="form-message form-success" aria-live="polite">{message}</p>;
}
