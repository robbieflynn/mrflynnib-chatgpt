"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type HeaderAccountLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export function HeaderAccountLink({ className = "", onNavigate }: HeaderAccountLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<{ role: "student" | "teacher" | "admin"; curriculum: "ib" | "igcse" } | null>(null);
  const isIgcse = pathname.startsWith("/igcse");
  const isStudentArea = pathname === "/account" || pathname.startsWith("/account/") || pathname === "/igcse/account" || pathname.startsWith("/igcse/account/") || pathname.startsWith("/assignments/");
  const isTeacherArea = pathname === "/teacher" || pathname.startsWith("/teacher/") || pathname === "/igcse/teacher" || pathname.startsWith("/igcse/teacher/");
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
  const accountHref = account?.curriculum === "igcse"
    ? accountIsTeacher ? "/igcse/teacher" : "/account?qualification=igcse"
    : accountIsTeacher ? "/teacher" : "/account";
  const href = pathname === "/platform-review" ? reviewHref : account ? accountHref : isIgcse ? "/igcse/account" : "/account";
  const label = pathname === "/platform-review"
    ? reviewRole === "teacher" ? "Teacher home" : "My learning"
    : account ? accountIsTeacher ? "Teacher home" : "My learning"
      : isTeacherArea ? "Teacher home" : isStudentArea ? "My learning" : "Log in";

  return <Link className={className} href={href} onClick={onNavigate}>{label}</Link>;
}
