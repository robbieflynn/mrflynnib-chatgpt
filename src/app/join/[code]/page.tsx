import type { Metadata } from "next";
import Link from "next/link";
import { joinClass } from "@/app/account/actions";
import { Breadcrumbs, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

function normaliseCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = normaliseCode(rawCode);
  const invitationPath = `/join/${encodeURIComponent(code)}`;
  const title = "Join your class";
  const description = "Open your Mr Flynn IB class invitation, sign in and join your teacher's class.";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: invitationPath },
    openGraph: {
      type: "website",
      siteName: "Mr Flynn IB",
      title: `${title} | Mr Flynn IB`,
      description,
      url: invitationPath,
      images: [{ url: "/images/mr-flynn-ib-preview.png", width: 1200, height: 630, type: "image/png", alt: "Join your class on Mr Flynn IB" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Mr Flynn IB`,
      description,
      images: ["/images/mr-flynn-ib-preview.png"],
    },
  };
}

export default async function JoinClassPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code: rawCode } = await params;
  const { error } = await searchParams;
  const code = normaliseCode(rawCode);
  const returnPath = `/join/${code}`;
  const validCode = /^[A-Z0-9]{6,10}$/.test(code);
  const supabase = await createClient();
  const { data: invitationCurriculum } = validCode
    ? await supabase.rpc("class_invitation_curriculum", { raw_code: code })
    : { data: null };
  const isIgcseInvitation = invitationCurriculum === "igcse";
  const accountHref = isIgcseInvitation ? "/igcse/account" : "/account";
  const dashboardHref = isIgcseInvitation ? "/igcse/account" : "/account";
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role,display_name").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";

  return (
    <section className="section join-invitation-page">
      <Container className="narrow stack-xl">
        <Breadcrumbs items={[{ label: "Join a class" }]} />
        <div className="join-invitation-card stack-lg">
          <div className="stack-sm">
            <p className="eyebrow">Class invitation</p>
            <h1>Join your class</h1>
            <p className="lede">Your teacher has invited you to complete assignments through Mr Flynn IB.</p>
          </div>
          <div className="join-invitation-code"><span>Class code</span><strong>{validCode ? code : "Invalid code"}</strong></div>
          {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
          {!validCode || !invitationCurriculum ? <><p>This invitation link is not valid. Ask your teacher to copy the link again.</p><Link className="button button-secondary" href="/account">Open student dashboard</Link></> : !user ? <><p>Sign in or create your Mr Flynn student account, then you will return here to join the {isIgcseInvitation ? "IGCSE" : "IB"} class.</p><Link className="button" href={`${accountHref}?next=${encodeURIComponent(returnPath)}`}>Sign in to join</Link></> : isTeacher ? <><p>This is a teacher account. Class invitations are for student accounts.</p><Link className="button button-secondary" href={isIgcseInvitation ? "/igcse/teacher" : "/teacher"}>Open teacher dashboard</Link></> : <><p>{profile?.display_name ? `${profile.display_name}, you are` : "You are"} ready to join this class. You only need to confirm once.</p><form action={joinClass}><input name="code" type="hidden" value={code} /><input name="returnPath" type="hidden" value={returnPath} /><button className="button" type="submit">Join this class</button></form><Link className="text-link" href={dashboardHref}>Back to student dashboard</Link></>}
        </div>
      </Container>
    </section>
  );
}
