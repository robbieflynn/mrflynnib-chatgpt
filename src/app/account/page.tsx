import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container, PageHero } from "@/components/ui";
import { StudentAccountForm } from "@/components/student-account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Student account",
  description: "Sign in to save question-bank progress and whiteboard working.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!hasSupabaseBrowserConfig()) {
    return (
      <>
        <PageHero eyebrow="Student account" title="Student accounts are being prepared" intro="The account service still needs its secure connection before students can sign in." />
        <section className="section-tight"><Container className="narrow"><div className="account-card"><p>No student information is being collected yet.</p></div></Container></section>
      </>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <PageHero eyebrow="Student account" title="Save your question-bank progress" intro="Sign in to tick off completed questions and continue your whiteboard working on another device." />
        <section className="section-tight"><Container className="account-layout"><Suspense fallback={<div className="account-card">Loading account…</div>}><StudentAccountForm /></Suspense><aside className="account-benefits stack"><h2>One account for your practice</h2><ul><li>Use the same account for IB and IGCSE Mathematics.</li><li>Tick off questions as you complete them.</li><li>Return to editable whiteboard working later.</li><li>Keep the question banks free and publicly viewable.</li></ul><p className="small muted">Your course purchases and lessons remain in Teachable. This account is for Mr Flynn IB question-bank tools.</p></aside></Container></section>
      </>
    );
  }

  const [{ count: completedCount }, { count: whiteboardCount }] = await Promise.all([
    supabase.from("question_progress").select("question_id", { count: "exact", head: true }).eq("completed", true),
    supabase.from("whiteboard_documents").select("question_id", { count: "exact", head: true }),
  ]);
  const displayName = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "";

  return (
    <>
      <PageHero eyebrow="Student account" title={displayName ? `Welcome back, ${displayName}` : "Your question-bank progress"} intro="Your completed questions and whiteboard working are saved securely to this account." />
      <section className="section-tight"><Container className="stack-lg"><div className="account-stats"><div><strong>{completedCount ?? 0}</strong><span>questions completed</span></div><div><strong>{whiteboardCount ?? 0}</strong><span>saved whiteboards</span></div></div><div className="account-actions"><Link className="button" href="/question-bank">Open IB question bank</Link><Link className="button button-secondary" href="/igcse/question-bank">Open IGCSE question bank</Link><SignOutButton /></div><p className="small muted">Signed in as {user.email}</p></Container></section>
    </>
  );
}
