import type { Metadata } from "next";
import TermsPage from "@/app/terms/page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using the Mr Flynn IGCSE Mathematics website and learning tools.",
};

export default function IgcseTermsPage() {
  return <TermsPage />;
}
