import { redirect } from "next/navigation";

export default async function LearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const target = new URLSearchParams({ curriculum: "ib" });
  target.set("course", typeof query.course === "string" ? query.course : "aa-hl");
  if (typeof query.view === "string") target.set("view", query.view);
  redirect(`/learn/index.html?${target.toString()}`);
}
