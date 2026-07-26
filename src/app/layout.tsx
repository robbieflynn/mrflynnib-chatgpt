import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "katex/dist/katex.min.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Mr Flynn IB | The home of IB Mathematics", template: "%s | Mr Flynn IB" },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "Mr Flynn IB | The home of IB Mathematics",
    description: siteConfig.description,
    url: siteConfig.url,
    images: [{ url: "/og-default.svg", width: 1200, height: 630, alt: "Mr Flynn IB" }],
  },
  twitter: { card: "summary_large_image", title: "Mr Flynn IB", description: siteConfig.description, images: ["/og-default.svg"] },
};

export const viewport: Viewport = { themeColor: "#0b1530", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        {gaId && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
        </>}
      </body>
    </html>
  );
}
