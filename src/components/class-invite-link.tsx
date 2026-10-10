"use client";

import { useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

export function ClassInviteLink({ invitationUrl }: { invitationUrl: string }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  async function copyInvitationLink() {
    let copied = false;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      copied = true;
    } catch {
      const input = document.createElement("input");
      input.value = invitationUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();

      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        input.remove();
      }
    }

    setCopyStatus(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyStatus("idle"), 2400);
  }

  return (
    <div className="class-invite-copy">
      <button className="button button-secondary" type="button" onClick={copyInvitationLink}>
        {copyStatus === "copied" ? "Link copied" : copyStatus === "failed" ? "Copy failed" : "Copy invitation link"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus === "copied"
          ? "Invitation link copied to clipboard."
          : copyStatus === "failed"
            ? "The invitation link could not be copied. Please try again."
            : ""}
      </span>
    </div>
  );
}
