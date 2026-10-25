import type { Metadata } from "next";
import { CourseAccessPage } from "@/components/platform/course-access-page";

export const metadata: Metadata = { title: "IGCSE course access", robots: { index: false, follow: false } };

export default function IgcseAccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CourseAccessPage curriculum="igcse" searchParams={searchParams} />;
}
