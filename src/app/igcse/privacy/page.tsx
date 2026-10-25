import type { Metadata } from "next";
import PrivacyPage from "@/app/privacy/page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Mr Flynn IGCSE Mathematics collects, uses and protects personal information.",
};

export default function IgcsePrivacyPage() {
  return <PrivacyPage />;
}
