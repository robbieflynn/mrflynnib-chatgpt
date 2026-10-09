"use client";

import { useState } from "react";

export function ClassInviteLink({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copyInvitationLink() {
    const invitationLink = `${window.location.origin}/join/${encodeURIComponent(joinCode)}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
    } catch {
      const input = document.createElement("input");
      input.value = invitationLink;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  return (
    <div className="class-invite-copy">
      <button className="button button-secondary" type="button" onClick={copyInvitationLink}>
        {copied ? "Link copied" : "Copy invitation link"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Invitation link copied to clipboard." : ""}</span>
    </div>
  );
}
