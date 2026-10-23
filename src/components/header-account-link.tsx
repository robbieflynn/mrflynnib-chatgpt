"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type HeaderAccountLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export function HeaderAccountLink({ className = "", onNavigate }: HeaderAccountLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isIgcse = pathname.startsWith("/igcse");
  const isStudentArea = pathname === "/account" || pathname.startsWith("/account/") || pathname === "/igcse/account" || pathname.startsWith("/igcse/account/") || pathname.startsWith("/assignments/");
  const isTeacherArea = pathname === "/teacher" || pathname.startsWith("/teacher/") || pathname === "/igcse/teacher" || pathname.startsWith("/igcse/teacher/");
  const reviewCurriculum = searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const reviewRole = searchParams.get("role") === "teacher" ? "teacher" : "student";
  const reviewHref = `/platform-review?curriculum=${reviewCurriculum}&role=${reviewRole}`;

  const href = pathname === "/platform-review" ? reviewHref : isIgcse ? "/igcse/account" : "/account";
  const label = pathname === "/platform-review"
    ? reviewRole === "teacher" ? "Teacher home" : "My learning"
    : isTeacherArea ? "Teacher home" : isStudentArea ? "My learning" : "Log in";

  return <Link className={className} href={href} onClick={onNavigate}>{label}</Link>;
}
