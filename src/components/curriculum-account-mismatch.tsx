"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function CurriculumAccountMismatch({ currentArea, requestedArea }: { currentArea: "IB" | "IGCSE"; requestedArea: "IB" | "IGCSE" }) {
  const [pending, setPending] = useState(false);
  const requestedHref = requestedArea === "IGCSE" ? "/igcse/account" : "/account";
  const currentHref = currentArea === "IGCSE" ? "/igcse/account" : "/account";

  async function switchAccount() {
    setPending(true);
    await createClient().auth.signOut({ scope: "local" });
    window.location.replace(requestedHref);
  }

  return (
    <>
      <section className={`account-entry-hero ${requestedArea === "IGCSE" ? "is-igcse" : ""}`}>
        <Container className="stack-sm"><Eyebrow>{requestedArea} Mathematics account</Eyebrow><h1>Sign in to the {requestedArea} area</h1><p>You are currently signed in to a separate {currentArea} account.</p></Container>
      </section>
      <section className="section-tight account-entry-section"><Container className="narrow"><div className="account-card stack-lg"><div className="stack-sm"><h2>Continue to {requestedArea} Mathematics</h2><p>Sign out of your {currentArea} account, then sign in with your {requestedArea} account details.</p></div><div className="cluster"><button className="button" type="button" disabled={pending} onClick={switchAccount}>{pending ? "Signing out…" : `Sign out and continue to ${requestedArea}`}</button><Link className="button button-secondary" href={currentHref}>Return to {currentArea}</Link></div></div></Container></section>
    </>
  );
}
