import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/account-access";

export default async function IgcseLearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSignedIn("/igcse/learn", "igcse");
  const query = await searchParams;
  const target = new URLSearchParams({ curriculum: "igcse", course: "igcse" });
  if (typeof query.topic === "string") target.set("topic", query.topic);
  redirect(`/learn/index.html?${target.toString()}`);
}
