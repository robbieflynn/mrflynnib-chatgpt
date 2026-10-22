import type { Metadata } from "next";
import { CourseAccessPage } from "@/components/platform/course-access-page";

export const metadata: Metadata = { title: "Course access", robots: { index: false, follow: false } };

export default async function AccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CourseAccessPage curriculum="ib" searchParams={searchParams} />;
}
