import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, PageHero } from "@/components/ui";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new IGCSE password", robots: { index: false, follow: false } };

export default async function IgcseUpdatePasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/igcse/account");

  return <><PageHero eyebrow="IGCSE Mathematics account" title="Choose a new password" intro="Enter a new password for your IGCSE Mathematics account." homeHref="/igcse" homeLabel="IGCSE home" /><section className="section-tight"><Container className="narrow"><UpdatePasswordForm destination="/igcse/account" /></Container></section></>;
}
