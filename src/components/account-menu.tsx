"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

type AccountSummary = {
  displayName: string;
  email: string;
  role: "student" | "teacher" | "admin";
};

function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0] || ""}`.toUpperCase();
  return (words[0]?.slice(0, 2) || email.slice(0, 2) || "ME").toUpperCase();
}

export function AccountMenu({ signOutHref = "/account" }: { signOutHref?: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role,display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;

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
      });
    }

    void loadAccount();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => void loadAccount());

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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

  if (!account) return null;

  const roleLabel = account.role === "admin" ? "Administrator" : account.role === "teacher" ? "Teacher" : "Student";

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
    <div className="account-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        className="account-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="account-menu-panel"
        aria-haspopup="menu"
        aria-label={`Open account menu for ${account.displayName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-menu-avatar" aria-hidden="true">{initials(account.displayName, account.email)}</span>
        <span className="account-menu-trigger-copy"><strong>{account.displayName}</strong><small>{roleLabel}</small></span>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
      </button>

      {open ? (
        <div className="account-menu-panel" id="account-menu-panel" role="menu">
          <div className="account-menu-identity">
            <span className="account-menu-avatar account-menu-avatar-large" aria-hidden="true">{initials(account.displayName, account.email)}</span>
            <span><small>Signed in as {roleLabel.toLowerCase()}</small><strong>{account.displayName}</strong><span>{account.email}</span></span>
          </div>
          <button className="account-menu-signout" type="button" role="menuitem" disabled={signingOut} onClick={signOut}>
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M8 4H4v12h4M12 6l4 4-4 4M16 10H8" /></svg>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
