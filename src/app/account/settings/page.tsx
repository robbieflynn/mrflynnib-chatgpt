import type { Metadata } from "next";
import { AccountSettingsPage } from "@/components/account-settings-page";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default function SettingsPage() {
  return <AccountSettingsPage curriculum="ib" />;
}
