import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTeacherApplicationEmail } from "@/lib/teacher-application-email";

function isSafeRelativePath(value: string | null): value is string {
  return Boolean(value?.startsWith("/") && !value.startsWith("//"));
}

function getNextPath(rawNext: string | null) {
  if (isSafeRelativePath(rawNext)) return rawNext;

  if (rawNext) {
    try {
      const redirectUrl = new URL(rawNext);
      const nestedNext = redirectUrl.searchParams.get("next");
      if (isSafeRelativePath(nestedNext)) return nestedNext;
    } catch {
      // Ignore malformed redirect values and use the safe account fallback.
    }
  }

  return "/account";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getNextPath(request.nextUrl.searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await Promise.all([
          supabase.rpc("claim_verified_course_access"),
          supabase.rpc("claim_school_plus_access"),
        ]);
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name,curriculum,teacher_status,teacher_notification_sent_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          profile?.teacher_status === "pending" &&
          !profile.teacher_notification_sent_at &&
          user.email
        ) {
          const sent = await sendTeacherApplicationEmail({
            name: profile.display_name,
            email: user.email,
          });
          if (sent) await supabase.rpc("mark_teacher_notification_sent");
          return NextResponse.redirect(
            new URL(profile.curriculum === "igcse" ? "/igcse/account?teacher=requested" : "/account?teacher=requested", request.nextUrl.origin),
          );
        }
      }

      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/account?error=confirmation", request.nextUrl.origin),
  );
}
