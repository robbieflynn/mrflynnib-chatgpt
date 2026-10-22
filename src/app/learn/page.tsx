import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/account-access";

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSignedIn("/learn");
  const query = await searchParams;
  const course = typeof query.course === "string" ? `?course=${encodeURIComponent(query.course)}` : "";
  redirect(`/learn/index.html${course}`);
}
