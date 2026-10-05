import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, PageHero } from "@/components/ui";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account");
  return <><PageHero eyebrow="Student account" title="Choose a new password" intro="Enter a new password for your Mr Flynn IB student account." /><section className="section-tight"><Container className="narrow"><UpdatePasswordForm /></Container></section></>;
}
