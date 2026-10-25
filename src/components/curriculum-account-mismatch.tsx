"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";

export function CurriculumAccountMismatch({ currentArea, requestedArea }: { currentArea: "IB" | "IGCSE"; requestedArea: "IB" | "IGCSE" }) {
  const [pending, setPending] = useState(false);
  const requestedHref = requestedArea === "IGCSE" ? "/igcse/account" : "/account";
  const currentHref = currentArea === "IGCSE" ? "/igcse/account" : "/account";

  async function switchAccount() {
    setPending(true);
    await fetch("/api/platform/sign-out", { method: "POST" });
    window.location.assign(requestedHref);
  }

  return (
    <>
      <section className={`account-entry-hero ${requestedArea === "IGCSE" ? "is-igcse" : ""}`}>
        <Container className="stack-sm"><Eyebrow>{requestedArea} Mathematics account</Eyebrow><h1>Sign in to the {requestedArea} area</h1><p>You are currently signed in to a separate {currentArea} account.</p></Container>
      </section>
      <section className="section-tight account-entry-section"><Container className="narrow"><div className="account-card stack-lg"><div className="stack-sm"><h2>Keep the two learning spaces separate</h2><p>Sign out of the {currentArea} account, then sign in with the {requestedArea} account you want to use. Classes, assignments and saved work will stay in their correct area.</p></div><div className="cluster"><button className="button" type="button" disabled={pending} onClick={switchAccount}>{pending ? "Signing out…" : `Sign out and continue to ${requestedArea}`}</button><Link className="button button-secondary" href={currentHref}>Return to {currentArea}</Link></div></div></Container></section>
    </>
  );
}
