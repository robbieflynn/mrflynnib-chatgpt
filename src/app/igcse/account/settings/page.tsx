import type { Metadata } from "next";
import { AccountSettingsPage } from "@/components/account-settings-page";

export const metadata: Metadata = { title: "IGCSE account settings", robots: { index: false, follow: false } };

export default function IgcseSettingsPage() {
  return <AccountSettingsPage curriculum="igcse" />;
}
