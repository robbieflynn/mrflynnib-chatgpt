"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type HeaderAccountLinkProps = {
  className?: string;
  onNavigate?: () => void;
  showSignedOut?: boolean;
};

export function HeaderAccountLink({ className = "", onNavigate, showSignedOut = true }: HeaderAccountLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<{ role: "student" | "teacher" | "admin"; curriculum: "ib" | "igcse" } | null>(null);
  const isIgcse = pathname.startsWith("/igcse");
  const reviewCurriculum = searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const reviewRole = searchParams.get("role") === "teacher" ? "teacher" : "student";
  const reviewHref = `/platform-review?curriculum=${reviewCurriculum}&role=${reviewRole}`;

  useEffect(() => {
    if (!hasSupabaseBrowserConfig() || pathname === "/platform-review") return;
    const supabase = createClient();
    let active = true;
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setAccount(null);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role,curriculum").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setAccount({
        role: profile?.role === "teacher" || profile?.role === "admin" ? profile.role : "student",
        curriculum: profile?.curriculum === "igcse" ? "igcse" : "ib",
      });
    }
    void loadAccount();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void loadAccount());
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [pathname]);

  const accountIsTeacher = account?.role === "teacher" || account?.role === "admin";
  const accountMatchesArea = !account || account.role === "admin" || (isIgcse ? account.curriculum === "igcse" : account.curriculum === "ib");
  const accountHref = isIgcse
    ? accountIsTeacher ? "/igcse/teacher" : "/igcse/account"
    : account?.curriculum === "igcse"
      ? accountIsTeacher ? "/igcse/teacher" : "/igcse/account"
      : accountIsTeacher ? "/teacher" : "/account";
  const href = pathname === "/platform-review" ? reviewHref : account && accountMatchesArea ? accountHref : isIgcse ? "/igcse/account" : "/account";
  const label = pathname === "/platform-review"
    ? reviewRole === "teacher" ? "Teacher home" : "My learning"
    : account && accountMatchesArea ? accountIsTeacher ? "Teacher home" : "My learning"
      : "Log in";

  if (!account && !showSignedOut && pathname !== "/platform-review") return null;

  return <Link className={className} href={href} onClick={onNavigate}>{label}</Link>;
}
