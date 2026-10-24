import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getCourseProduct } from "@/lib/platform-products";

export const metadata: Metadata = {
  title: "Mr Flynn IB Plus",
  robots: { index: false, follow: false },
};

type PlusSearchParams = { course?: string | string[] };

export default async function PlusPage({ searchParams }: { searchParams: Promise<PlusSearchParams> }) {
  const query = await searchParams;
  const requestedCourse = typeof query.course === "string" ? query.course : "";
  const requestedProduct = getCourseProduct(requestedCourse);
  const selected = requestedProduct?.curriculum === "ib" ? requestedProduct : undefined;
  const nextPath = selected ? `/account/access?course=${selected.id}` : "/account/access";

  if (hasSupabaseBrowserConfig()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(nextPath);
  }

  const accountQuery = new URLSearchParams({ mode: "sign-up", plan: "plus", next: nextPath });
  if (selected) accountQuery.set("course", selected.id);
  redirect(`/account?${accountQuery.toString()}`);
}
