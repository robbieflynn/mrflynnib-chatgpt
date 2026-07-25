import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/site";

export function GET() {
  if (siteConfig.teachableLoginUrl.startsWith("#")) return NextResponse.redirect(new URL("/courses?login=setup-needed", siteConfig.url));
  return NextResponse.redirect(siteConfig.teachableLoginUrl);
}
