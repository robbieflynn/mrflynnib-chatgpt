import { redirect } from "next/navigation";

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const target = new URLSearchParams({ curriculum: "ib" });
  if (typeof query.course === "string") target.set("course", query.course);
  if (typeof query.view === "string") target.set("view", query.view);
  if (!target.has("course") && !target.has("view")) target.set("course", "aa-hl");
  redirect(`/learn/index.html?${target.toString()}`);
}
