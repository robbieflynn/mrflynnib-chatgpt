"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({ confirmation, idleLabel, pendingLabel, className = "button" }: { confirmation: string; idleLabel: string; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} onClick={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }} type="submit">{pending ? pendingLabel : idleLabel}</button>;
}
