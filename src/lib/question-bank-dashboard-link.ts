import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type DashboardLinkOptions = {
  curriculum: "ib" | "igcse";
  course?: string;
};

export async function getQuestionBankDashboardLink({ curriculum, course }: DashboardLinkOptions) {
  const studentHref = curriculum === "igcse"
    ? "/account?qualification=igcse"
    : `/account${course ? `?course=${encodeURIComponent(course)}` : ""}`;

  if (!hasSupabaseBrowserConfig()) {
    return { label: "Student dashboard", href: studentHref };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { label: "Student dashboard", href: studentHref };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";

  if (isTeacher) {
    return {
      label: "Teacher dashboard",
      href: curriculum === "igcse" ? "/igcse/teacher" : "/teacher",
    };
  }

  return { label: "Student dashboard", href: studentHref };
}
