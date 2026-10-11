import { redirect } from "next/navigation";

export default async function IgcseAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = new URLSearchParams({ qualification: "igcse" });
  Object.entries(params).forEach(([key, value]) => {
    if (key === "qualification" || typeof value !== "string") return;
    query.set(key, value);
  });
  redirect(`/account?${query.toString()}`);
}
