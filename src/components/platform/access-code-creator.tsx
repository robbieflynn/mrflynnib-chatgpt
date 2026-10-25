"use client";

import { useActionState } from "react";
import { createAccessCode, type AccessCodeActionState } from "@/app/teacher/platform-access/actions";

type ProductOption = { productCode: string; label: string };

export function AccessCodeCreator({ products }: { products: ProductOption[] }) {
  const initialState: AccessCodeActionState = { status: "idle" };
  const [state, action, pending] = useActionState(createAccessCode, initialState);
  return <div className="account-card stack-lg platform-admin-form-card">
    <div><p className="eyebrow">Free-access codes</p><h2>Create a redemption code</h2><p className="muted">Choose exactly what the code unlocks, how long access lasts and how many accounts may use it.</p></div>
    {state.status === "success" && state.code ? <div className="access-code-result" role="status"><span>New code</span><strong>{state.code}</strong><p>{state.message}</p></div> : null}
    {state.status === "error" ? <p className="form-message form-error">{state.message}</p> : null}
    <form action={action} className="stack">
      <label className="field"><span>Access</span><select name="productCode" required>{products.map((product) => <option key={product.productCode} value={product.productCode}>{product.label}</option>)}</select></label>
      <div className="platform-admin-form-row">
        <label className="field"><span>Access period</span><select name="accessDays" defaultValue="730"><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="730">2 years</option><option value="lifetime">No expiry</option></select></label>
        <label className="field"><span>Number of uses</span><input name="maxRedemptions" type="number" min="1" max="10000" defaultValue="1" required /></label>
      </div>
      <label className="field"><span>Code expires on <small>(optional)</small></span><input name="expiresOn" type="date" /></label>
      <label className="field"><span>Custom code <small>(optional)</small></span><input name="customCode" autoComplete="off" placeholder="Leave blank to generate one" maxLength={80} /></label>
      <label className="field"><span>Internal note <small>(optional)</small></span><input name="note" placeholder="School, student or reason" maxLength={500} /></label>
      <button className="button" type="submit" disabled={pending}>{pending ? "Creating code…" : "Create access code"}</button>
    </form>
  </div>;
}

