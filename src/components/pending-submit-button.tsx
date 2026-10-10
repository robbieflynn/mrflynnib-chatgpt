"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({ idleLabel, pendingLabel, className = "button" }: { idleLabel: string; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} type="submit">{pending ? pendingLabel : idleLabel}</button>;
}
