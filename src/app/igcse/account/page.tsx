import type { Metadata } from "next";
import AccountPage from "@/app/account/page";

export const metadata: Metadata = {
  title: "IGCSE Mathematics account",
  description: "Sign in to your Mr Flynn account for the IGCSE Mathematics learning area.",
  robots: { index: false, follow: false },
};

export default async function IgcseAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <AccountPage searchParams={Promise.resolve({ ...params, qualification: "igcse" })} />;
}
