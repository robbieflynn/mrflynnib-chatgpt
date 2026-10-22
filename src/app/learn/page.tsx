import { redirect } from "next/navigation";
import { requireSignedIn } from "@/lib/account-access";

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSignedIn("/learn", "ib");
  const query = await searchParams;
  const target = new URLSearchParams({ curriculum: "ib" });
  if (typeof query.course === "string") target.set("course", query.course);
  redirect(`/learn/index.html?${target.toString()}`);
}
