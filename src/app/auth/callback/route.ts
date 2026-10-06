import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTeacherApplicationEmail } from "@/lib/teacher-application-email";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") ? requestedNext : "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("display_name,teacher_status,teacher_notification_sent_at").eq("user_id", user.id).maybeSingle();
        if (profile?.teacher_status === "pending" && !profile.teacher_notification_sent_at && user.email) {
          const sent = await sendTeacherApplicationEmail({ name: profile.display_name, email: user.email });
          if (sent) await supabase.rpc("mark_teacher_notification_sent");
          return NextResponse.redirect(new URL("/account?teacher=requested", requestUrl.origin));
        }
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/account?error=confirmation", requestUrl.origin));
}
