import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Mr Flynn IB | Your home for IB Mathematics", template: "%s | Mr Flynn IB" },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "Mr Flynn IB | Your home for IB Mathematics",
    description: siteConfig.description,
    url: siteConfig.url,
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "Mr Flynn IB" }],
  },
  twitter: { card: "summary_large_image", title: "Mr Flynn IB", description: siteConfig.description, images: ["/og-default.svg"] },
};

export const viewport: Viewport = { themeColor: "#0b1530", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
