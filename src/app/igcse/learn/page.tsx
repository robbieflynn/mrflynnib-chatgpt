import { redirect } from "next/navigation";

export default async function IgcseLearnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const target = new URLSearchParams({ curriculum: "igcse", course: "igcse" });
  if (typeof query.topic === "string") target.set("topic", query.topic);
  if (typeof query.view === "string") target.set("view", query.view);
  redirect(`/learn/index.html?${target.toString()}`);
}
