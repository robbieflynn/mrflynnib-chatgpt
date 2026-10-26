"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { platformAccessSummary, type PlatformEntitlement, type PlatformLicenseSeat } from "@/lib/platform-access";

type AccountSummary = {
  displayName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  curriculum: "ib" | "igcse";
  accessLabel?: string | null;
};

type AccountMenuProps = {
  signOutHref?: string;
  showNavigation?: boolean;
  className?: string;
  signedOutClassName?: string;
  signedOutLabel?: string;
  showSignedOut?: boolean;
};

function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0] || ""}`.toUpperCase();
  return (words[0]?.slice(0, 2) || email.slice(0, 2) || "ME").toUpperCase();
}

export function AccountMenu({
  signOutHref = "/account",
  showNavigation = false,
  className = "",
  signedOutClassName = "button button-small header-login-button",
  signedOutLabel = "Log in",
  showSignedOut = false,
}: AccountMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [account, setAccount] = useState<AccountSummary | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isPlatformReview = pathname === "/platform-review";
  const previewRole = searchParams.get("role") === "teacher" ? "teacher" : "student";
  const previewCurriculum = searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const routeCurriculum = pathname.startsWith("/igcse") || searchParams.get("curriculum") === "igcse" ? "igcse" : "ib";
  const previewAccount: AccountSummary | null = isPlatformReview ? {
    displayName: previewRole === "teacher" ? "Mr Flynn" : "Maya Flynn",
    email: previewRole === "teacher" ? "teacher@example.com" : "student@example.com",
    role: previewRole,
    curriculum: previewCurriculum,
  } : null;
  const displayedAccount = previewAccount || account;

  useEffect(() => {
    if (isPlatformReview) return;
    if (!hasSupabaseBrowserConfig()) return;

    const supabase = createClient();
    let active = true;

    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setAccount(null);
        return;
      }

      const [{ data: profile }, { data: entitlements }, { data: schoolSeats }] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("platform_entitlements")
          .select("product_code,status,starts_at,expires_at")
          .eq("user_id", user.id),
        supabase
          .from("organization_license_seats")
          .select("revoked_at,organization_licenses(product_code,status,starts_at,ends_at)")
          .eq("user_id", user.id)
          .is("revoked_at", null),
      ]);
      if (!active) return;

      const access = platformAccessSummary(
        entitlements as PlatformEntitlement[] | null,
        schoolSeats as PlatformLicenseSeat[] | null,
        new Date(),
        routeCurriculum,
      );

      const metadata = user.user_metadata || {};
      const metadataName = typeof metadata.display_name === "string"
        ? metadata.display_name
        : [metadata.first_name, metadata.last_name].filter((value) => typeof value === "string").join(" ");
      const email = user.email || "";
      const role = profile?.role === "teacher" || profile?.role === "admin" ? profile.role : "student";

      setAccount({
        displayName: profile?.display_name || metadataName || email.split("@")[0] || "Your account",
        email,
        role,
        curriculum: routeCurriculum,
        accessLabel: access.paid ? access.label : null,
      });
    }

    void loadAccount();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => void loadAccount());
    const refreshAccess = () => void loadAccount();
    window.addEventListener("platform-access-updated", refreshAccess);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("platform-access-updated", refreshAccess);
    };
  }, [isPlatformReview, routeCurriculum]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!displayedAccount) {
    if (!showSignedOut) return null;
    const isIgcse = pathname.startsWith("/igcse");
    const href = isIgcse ? "/igcse/account" : "/account";
    return <Link className={signedOutClassName} href={href}>{signedOutLabel}</Link>;
  }

  const roleLabel = displayedAccount.role === "admin" ? "Administrator" : displayedAccount.role === "teacher" ? "Teacher" : "Student";
  const accountStatusLabel = displayedAccount.accessLabel || roleLabel;
  const isTeacher = displayedAccount.role === "teacher" || displayedAccount.role === "admin";
  const accountHome = isPlatformReview
    ? `/platform-review?curriculum=${displayedAccount.curriculum}&role=${isTeacher ? "teacher" : "student"}`
    : displayedAccount.curriculum === "igcse"
    ? isTeacher ? "/igcse/teacher" : "/igcse/account"
    : isTeacher ? "/teacher" : "/account";
  const coursesHref = displayedAccount.curriculum === "igcse"
    ? "/igcse/learn"
    : "/learn/index.html?curriculum=ib&view=courses";
  const accessHref = displayedAccount.curriculum === "igcse"
    ? "/igcse/account"
    : isTeacher ? "/teacher/access" : "/account/access";

  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    setOpen(false);
    setAccount(null);
    router.push(signOutHref);
    router.refresh();
  }

  return (
    <div className={`account-menu ${className}`.trim()} ref={menuRef}>
      <button
        ref={triggerRef}
        className="account-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        aria-label={`Open account menu for ${displayedAccount.displayName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-menu-avatar" aria-hidden="true">{initials(displayedAccount.displayName, displayedAccount.email)}</span>
        <span className="account-menu-trigger-copy"><strong>{displayedAccount.displayName}</strong><small>{accountStatusLabel}</small></span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
      </button>

      {open ? (
        <div className="account-menu-panel" id={panelId} role="menu">
          <div className="account-menu-identity">
            <span className="account-menu-avatar account-menu-avatar-large" aria-hidden="true">{initials(displayedAccount.displayName, displayedAccount.email)}</span>
            <span><small>{displayedAccount.accessLabel ? `${displayedAccount.accessLabel} · ${roleLabel}` : `${isPlatformReview ? "Example" : "Signed in as"} ${roleLabel.toLowerCase()}`}</small><strong>{displayedAccount.displayName}</strong><span>{displayedAccount.email}</span></span>
          </div>
          {showNavigation ? <nav className="account-menu-navigation" aria-label="Account navigation">
            <Link href={accountHome} role="menuitem" onClick={() => setOpen(false)}>{isTeacher ? "Teacher home" : "Learning home"}</Link>
            <Link href={coursesHref} role="menuitem" onClick={() => setOpen(false)}>Courses</Link>
            <Link href={accessHref} role="menuitem" onClick={() => setOpen(false)}>Manage access</Link>
            {!isPlatformReview ? <Link href={displayedAccount.curriculum === "igcse" ? "/go/igcse-course" : "/go/my-courses"} role="menuitem" onClick={() => setOpen(false)}>Previous Teachable course</Link> : null}
          </nav> : null}
          {!isPlatformReview ? <button className="account-menu-signout" type="button" role="menuitem" disabled={signingOut} onClick={signOut}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M8 4H4v12h4M12 6l4 4-4 4M16 10H8" /></svg>
            {signingOut ? "Signing out…" : "Sign out"}
          </button> : null}
        </div>
      ) : null}
    </div>
  );
}
