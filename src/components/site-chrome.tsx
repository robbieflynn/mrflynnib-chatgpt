"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteChrome({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isIgcse = pathname.startsWith("/igcse");

  return (
    <>
      {!isIgcse ? <SiteHeader /> : null}
      <main id="main-content">{children}</main>
      {!isIgcse ? <SiteFooter /> : null}
    </>
  );
}
