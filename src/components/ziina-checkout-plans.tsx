"use client";

import { useState } from "react";
import type { courseAccessPlans } from "@/lib/content";

type AccessPlan = (typeof courseAccessPlans)[number];

export function ZiinaCheckoutPlans({
  courseSlug,
  plans,
  testMode,
}: {
  courseSlug: string;
  plans: readonly AccessPlan[];
  testMode: boolean;
}) {
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function beginCheckout(planId: string) {
    if (busyPlan) return;
    setBusyPlan(planId);
    setError("");
    try {
      const response = await fetch("/api/checkout/ziina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseSlug, plan: planId }),
      });
      const result = await response.json() as { redirectUrl?: string; message?: string };
      if (!response.ok || !result.redirectUrl) throw new Error(result.message || "Checkout could not be started.");
      window.location.assign(result.redirectUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setBusyPlan(null);
    }
  }

  return (
    <div className="checkout-plan-stack">
      {testMode ? <p className="checkout-test-notice"><strong>Test checkout</strong><span>No real payment will be taken.</span></p> : null}
      <div className="checkout-plan-grid">
        {plans.map((plan) => (
          <article className={plan.recommended ? "checkout-plan-card is-recommended" : "checkout-plan-card"} key={plan.id}>
            {plan.recommended ? <span className="checkout-plan-badge">Recommended</span> : null}
            <div><h2>{plan.duration}</h2><p>{plan.description}</p></div>
            <strong className="checkout-plan-price"><small>US$</small>{plan.price}</strong>
            <button className="button" disabled={Boolean(busyPlan)} onClick={() => beginCheckout(plan.id)} type="button">
              {busyPlan === plan.id ? "Opening secure checkout…" : testMode ? "Test this plan" : "Choose this plan"}
            </button>
          </article>
        ))}
      </div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      <p className="checkout-security-note">Payment is completed securely with Ziina. Card details are never stored by Mr Flynn IB.</p>
    </div>
  );
}
