import { notFound } from "next/navigation";
import { CourseAccessView } from "@/components/platform/course-access-page";
export const metadata = { title: "Student checkout preview", robots: { index: false, follow: false } };
export default async function CheckoutPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <><p style={{margin:0,padding:".5rem 1rem",fontSize:".8rem",textAlign:"center",background:"#eaf1ff"}}>Design preview · example student · payments disabled</p><CourseAccessView curriculum="ib" query={await searchParams} session={{profile:null,access:null,ownedCourses:[]}} previewOnly /></>;
}
