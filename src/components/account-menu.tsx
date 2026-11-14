"use client";

import "./account-navigation.css";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { accountTier, platformAccessSummary, type PlatformEntitlement, type PlatformLicenseSeat } from "@/lib/platform-access";

export type AccountSummary = {
  displayName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  curriculum: "ib" | "igcse";
  teacherStatus?: "none" | "pending" | "approved" | "rejected" | null;
  accessLabel?: string | null;
  accessDetail?: string;
  hasCourseAccess?: boolean;
  hasTeacherPlus?: boolean;
  accessUnavailable?: boolean;
};

type AccountMenuProps = {
  initialAccount?: AccountSummary;
  signOutHref?: string;
  showNavigation?: boolean;
  className?: string;
  signedOutClassName?: string;
  signedOutLabel?: string;
  showSignedOut?: boolean;
  onNavigate?: () => void;
};

function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0] || ""}`.toUpperCase();
  return (words[0]?.slice(0, 2) || email.slice(0, 2) || "ME").toUpperCase();
}

export function AccountMenu({
  initialAccount,
  signOutHref = "/account",
  showNavigation = false,
  className = "",
  signedOutClassName = "button button-small header-login-button",
  signedOutLabel = "Log in",
  showSignedOut = false,
  onNavigate,
}: AccountMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [account, setAccount] = useState<AccountSummary | null | undefined>(initialAccount);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
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
    let requestId = 0;

    async function loadAccount() {
      const id = ++requestId;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!active || id !== requestId) return;
        if (!user) {
          setAccount(null);
          setLoadFailed(false);
          return;
        }

        const [{ data: profile, error: profileError }, { data: entitlements, error: entitlementError }, { data: schoolSeats, error: schoolError }] = await Promise.all([
          supabase
            .from("profiles")
            .select("role,display_name,teacher_status")
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
        if (!active || id !== requestId) return;

        if (profileError || !profile) throw profileError || new Error("Account profile unavailable");
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
          teacherStatus: profile?.teacher_status,
          accessLabel: access.label,
          accessDetail: access.detail,
          hasCourseAccess: access.hasCourseAccess,
          hasTeacherPlus: access.hasTeacherPlus,
          accessUnavailable: Boolean(entitlementError || schoolError),
        });
        setLoadFailed(false);
      } catch {
        if (active && id === requestId) setLoadFailed(true);
      }
    }

    void loadAccount();
    let refreshTimer: ReturnType<typeof setTimeout>;
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void loadAccount(), 0);
    });
    const refreshAccess = () => void loadAccount();
    window.addEventListener("platform-access-updated", refreshAccess);

    return () => {
      active = false;
      clearTimeout(refreshTimer);
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
    if (loadFailed) return <Link className={signedOutClassName} href={routeCurriculum === "igcse" ? "/igcse/account" : "/account"}>My account</Link>;
    if (!showSignedOut) return null;
    const isIgcse = pathname.startsWith("/igcse");
    const href = isIgcse ? "/igcse/account" : "/account";
    return <Link className={signedOutClassName} href={href} onClick={onNavigate}>{signedOutLabel}</Link>;
  }

  const roleLabel = displayedAccount.role === "admin" ? "Administrator" : displayedAccount.role === "teacher" ? "Teacher" : "Student";
  const teacherApprovalPending = displayedAccount.role === "student" && displayedAccount.teacherStatus === "pending";
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
    ? "/igcse/account/access"
    : isTeacher ? "/teacher/access" : "/account/access";
  const settingsHref = displayedAccount.curriculum === "igcse" ? "/igcse/account/settings" : "/account/settings";

  const tier = accountTier(displayedAccount.role, displayedAccount.accessUnavailable ? null : displayedAccount, displayedAccount.curriculum);
  const canUpgrade = !isPlatformReview && tier === "standard";
  const tierLabel = tier === "plus" ? "Plus account" : tier === "standard" ? "Standard account" : "Check account access";
  const upgradeLabel = "Upgrade to Plus";
  const firstName = displayedAccount.displayName.trim().split(/\s+/)[0] || "there";
  function navigate() { setOpen(false); onNavigate?.(); }

  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }
    setOpen(false);
    setAccount(null);
    onNavigate?.();
    router.push(signOutHref);
    router.refresh();
  }

  return (
    <div className={`account-controls account-navigation ${className}`.trim()}>
    {showNavigation ? <Link className="account-home-link" href={accountHome} onClick={navigate}>{isTeacher ? "Teacher home" : "My learning"}</Link> : null}
    <div className="account-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        className={`account-menu-trigger ${teacherApprovalPending ? "is-teacher-pending" : ""}`.trim()}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Open account menu for ${displayedAccount.displayName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-greeting"><strong>{firstName}</strong></span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
      </button>

      {open ? (
        <div className="account-menu-panel" id={panelId} aria-label="Account details">
          <div className="account-menu-identity">
            <span className="account-menu-avatar account-menu-avatar-large" aria-hidden="true">{initials(displayedAccount.displayName, displayedAccount.email)}</span>
            <span><strong>{displayedAccount.displayName}</strong><span>{displayedAccount.email}</span><small>{isPlatformReview ? `Example ${roleLabel.toLowerCase()}` : roleLabel}</small></span>
          </div>
          <div className="account-menu-access-summary"><strong>{tierLabel}</strong><small>{displayedAccount.role === "admin" ? "Administrator access" : tier === "unknown" ? "Access could not be checked. Open My account to retry." : displayedAccount.accessDetail || "View your courses and access in My account."}</small></div>
          {teacherApprovalPending ? <div className="account-menu-pending-note" role="status"><strong>Your teacher request is waiting for approval.</strong><span>You can keep using the student learning area while you wait.</span></div> : null}
          {!isPlatformReview ? <nav className="account-menu-navigation" aria-label="Account navigation">
            <Link href={settingsHref} onClick={navigate}>My account</Link>
            <Link href={accountHome} onClick={navigate}>{isTeacher ? "Teacher home" : "My learning"}</Link>
            {showNavigation ? <Link href={coursesHref} onClick={navigate}>Courses</Link> : null}
          </nav> : null}
          {!isPlatformReview ? <button className="account-menu-signout" type="button" disabled={signingOut} onClick={signOut}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M8 4H4v12h4M12 6l4 4-4 4M16 10H8" /></svg>
            {signingOut ? "Signing out…" : "Sign out"}
          </button> : null}
        </div>
      ) : null}
    </div>
    {canUpgrade ? <Link className="account-upgrade-button" href={accessHref} onClick={navigate}>{upgradeLabel}</Link> : <Link className={`account-tier-badge ${tier === "plus" ? "is-plus" : ""}`} href={settingsHref} onClick={navigate}>{tierLabel}</Link>}
    </div>
  );
}
