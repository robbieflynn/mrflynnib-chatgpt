"use client";

import { useState } from "react";

export function AccessPeriodField() {
  const [period, setPeriod] = useState("730");
  return <>
    <label className="field"><span>Access period</span>
      <select name={period === "custom" ? undefined : "accessDays"} value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="30">30 days</option><option value="90">90 days</option>
        <option value="365">1 year</option><option value="730">2 years</option>
        <option value="custom">Custom number of days</option><option value="lifetime">No expiry</option>
      </select>
    </label>
    {period === "custom" ? <label className="field"><span>Number of days</span>
      <input name="accessDays" type="number" min="1" max="3650" step="1" required />
      <small>Access starts when you grant it. Enter 1 to 3650 days.</small>
    </label> : null}
  </>;
}
