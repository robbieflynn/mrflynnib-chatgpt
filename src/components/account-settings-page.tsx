import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsPasswordForm } from "@/components/account-settings-password-form";
import { Container, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

type AccountSettingsPageProps = { curriculum: "ib" | "igcse" };

function accountTypeLabel(role: string | null | undefined) {
  if (role === "admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  return "Student";
}

export async function AccountSettingsPage({ curriculum }: AccountSettingsPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signInHref = curriculum === "igcse" ? "/igcse/account?next=/igcse/account/settings" : "/account?next=/account/settings";
  if (!user) redirect(signInHref);

  const { data: profile } = await supabase.from("profiles").select("display_name,role").eq("user_id", user.id).maybeSingle();
  const metadata = user.user_metadata || {};
  const metadataName = typeof metadata.display_name === "string"
    ? metadata.display_name
    : [metadata.first_name, metadata.last_name].filter((value) => typeof value === "string").join(" ");
  const email = user.email || "No email address";
  const displayName = profile?.display_name || metadataName || email.split("@")[0] || "Your account";
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const homeHref = curriculum === "igcse" ? isTeacher ? "/igcse/teacher" : "/igcse/account" : isTeacher ? "/teacher" : "/account";
  const accessHref = curriculum === "igcse" ? "/igcse/account/access" : isTeacher ? "/teacher/access" : "/account/access";

  return (
    <>
      <section className={`account-settings-hero ${curriculum === "igcse" ? "is-igcse" : ""}`}>
        <Container className="stack-sm"><Eyebrow>Account settings</Eyebrow><h1>Your account</h1><p>Keep your sign-in details secure and check the information attached to this account.</p></Container>
      </section>
      <section className="section-tight account-settings-section">
        <Container className="account-settings-layout">
          <div className="account-settings-details stack-lg">
            <div className="stack-xs"><p className="eyebrow">Account details</p><h2>Your information</h2></div>
            <dl className="account-settings-list">
              <div><dt>Name</dt><dd>{displayName}</dd></div>
              <div><dt>Email address</dt><dd>{email}</dd></div>
              <div><dt>Account type</dt><dd>{accountTypeLabel(profile?.role)}</dd></div>
            </dl>
            <p className="small muted">Contact Mr Flynn IB if your name or email address needs to be corrected.</p>
          </div>
          <AccountSettingsPasswordForm />
        </Container>
        <Container className="account-settings-footer">
          <p><strong>Looking for course or Plus access?</strong> Purchases, access codes and course entitlements remain in Manage access.</p>
          <div className="cluster"><Link className="button button-secondary" href={homeHref}>Return to {isTeacher ? "teacher home" : "learning home"}</Link><Link className="text-link" href={accessHref}>Manage access</Link></div>
        </Container>
      </section>
    </>
  );
}
