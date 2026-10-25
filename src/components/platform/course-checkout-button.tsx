"use client";

import { useState } from "react";

type CheckoutPlan = { id: string; label: string; priceUsd: number; badge?: string };

export function CourseCheckoutButton({ courseId, productId, plans }: { courseId?: string; productId?: string; plans: CheckoutPlan[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(plans.find((plan) => plan.badge)?.id || plans[0]?.id || "");
  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const requestId = crypto.randomUUID();
      const response = await fetch("/api/platform/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, productId, planId: selectedPlan, requestId }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout could not be started.");
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setBusy(false);
    }
  }
  const plan = plans.find((option) => option.id === selectedPlan) || plans[0];
  const singlePlan = plans.length === 1 ? plans[0] : null;
  return <div className="course-checkout stack-sm">
    {singlePlan ? <div className="course-single-plan">
      <span><strong>${singlePlan.priceUsd}</strong><small>{singlePlan.label} access</small></span>
      {singlePlan.badge ? <b>{singlePlan.badge}</b> : null}
    </div> : <fieldset className="course-plan-options"><legend>Choose access length</legend>{plans.map((option) => <label className={`course-plan-option ${selectedPlan === option.id ? "is-selected" : ""}`} key={option.id}>
      <input checked={selectedPlan === option.id} name={`plan-${courseId || productId}`} onChange={() => setSelectedPlan(option.id)} type="radio" value={option.id} />
      <span><strong>${option.priceUsd}</strong><small>{option.label}</small></span>
      {option.badge ? <b>{option.badge}</b> : null}
    </label>)}</fieldset>}
    <button className="button course-checkout-button" type="button" disabled={busy || !plan} onClick={startCheckout}>{busy ? "Opening secure checkout…" : `Continue to secure checkout for $${plan?.priceUsd || ""}`}</button>
    <div className="checkout-reassurance"><span>One payment</span><span>No automatic renewal</span></div>
    {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
  </div>;
}
