import type { Metadata } from "next";
import Link from "next/link";
import { joinClass } from "@/app/account/actions";
import { Breadcrumbs, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Join a class",
  robots: { index: false, follow: false },
};

function normaliseCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export default async function JoinClassPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code: rawCode } = await params;
  const { error } = await searchParams;
  const code = normaliseCode(rawCode);
  const returnPath = `/join/${code}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role,display_name").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const validCode = /^[A-Z0-9]{6,10}$/.test(code);

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
          {!validCode ? <><p>This invitation link is not valid. Ask your teacher to copy the link again.</p><Link className="button button-secondary" href="/account">Open student dashboard</Link></> : !user ? <><p>Sign in or create a student account, then you will return here to join the class.</p><Link className="button" href={`/account?next=${encodeURIComponent(returnPath)}`}>Sign in to join</Link></> : isTeacher ? <><p>This is a teacher account. Class invitations are for student accounts.</p><Link className="button button-secondary" href="/teacher">Open teacher dashboard</Link></> : <><p>{profile?.display_name ? `${profile.display_name}, you are` : "You are"} ready to join this class. You only need to confirm once.</p><form action={joinClass}><input name="code" type="hidden" value={code} /><input name="returnPath" type="hidden" value={returnPath} /><button className="button" type="submit">Join this class</button></form><Link className="text-link" href="/account">Back to student dashboard</Link></>}
        </div>
      </Container>
    </section>
  );
}
