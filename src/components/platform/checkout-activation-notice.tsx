"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ActivationState = "activating" | "active" | "delayed" | "failed";

export function CheckoutActivationNotice({
  sessionId,
  accessPath,
  title = "your complete course",
  openHref,
}: {
  sessionId: string;
  accessPath: string;
  title?: string;
  openHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActivationState>(sessionId.startsWith("cs_") ? "activating" : "delayed");

  useEffect(() => {
    if (!sessionId.startsWith("cs_")) return;
    let cancelled = false;
    async function waitForAccess() {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const response = await fetch(`/api/platform/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).catch(() => null);
        const result = response ? await response.json().catch(() => ({})) : {};
        if (result.status === "active") {
          setState("active");
          window.dispatchEvent(new Event("platform-access-updated"));
          router.refresh();
          return;
        }
        if (result.status === "failed" || result.status === "refunded") {
          setState("failed");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!cancelled) setState("delayed");
    }
    void waitForAccess();
    return () => { cancelled = true; };
  }, [accessPath, router, sessionId]);

  if (state === "failed") {
    return <div className="checkout-success-card is-error" role="alert"><div className="checkout-success-icon" aria-hidden="true">!</div><div><p className="eyebrow">Payment received</p><h2>We need to finish activating your access.</h2><p>Please contact us and we will connect the payment to your account.</p></div><Link className="button button-secondary" href="/contact">Contact Mr Flynn IB</Link></div>;
  }

  if (state === "active") {
    return <div className="checkout-success-card" role="status" aria-live="polite"><div className="checkout-success-icon" aria-hidden="true">✓</div><div><p className="eyebrow">Purchase complete</p><h2>Welcome to Mr Flynn IB Plus.</h2><p>{title} is now unlocked on this account. You can start watching immediately.</p></div><div className="checkout-success-actions"><Link className="button" href={openHref}>Start learning</Link><Link className="button button-secondary" href={accessPath}>View my access</Link></div></div>;
  }

  return <div className="checkout-success-card is-activating" role="status" aria-live="polite"><div className="checkout-success-icon" aria-hidden="true">+</div><div><p className="eyebrow">Payment complete</p><h2>{state === "activating" ? "Setting up your Plus access…" : "Your Plus access is nearly ready."}</h2><p>{state === "activating" ? "This normally takes only a few seconds. Please keep this page open." : "The payment is complete and activation will continue automatically. Refresh shortly if it has not appeared."}</p></div></div>;
}
