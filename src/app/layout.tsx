import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Mr Flynn IB | Your Home for IB Mathematics", template: "%s | Mr Flynn IB" },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "Mr Flynn IB | Your Home for IB Mathematics",
    description: siteConfig.description,
    url: siteConfig.url,
    images: [{ url: "/images/mr-flynn-ib-preview.png", width: 1200, height: 630, type: "image/png", alt: "Mr Flynn IB | Your Home for IB Mathematics" }],
  },
  twitter: { card: "summary_large_image", title: "Mr Flynn IB | Your Home for IB Mathematics", description: siteConfig.description, images: ["/images/mr-flynn-ib-preview.png"] },
};

export const viewport: Viewport = { themeColor: "#0b1530", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
