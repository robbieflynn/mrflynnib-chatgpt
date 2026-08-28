import type { MetadataRoute } from "next";
import { courses } from "@/lib/content";
import { questionBankCourses } from "@/lib/question-bank-courses";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/courses", "/ia", "/question-bank", "/tutoring", "/schools", "/book", "/about", "/results", "/contact", "/faq", "/privacy", "/terms", "/igcse", "/igcse/courses", "/igcse/question-bank", "/igcse/schools", "/igcse/tutoring"];
  return [
    ...staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : .7 })),
    ...courses.map((course) => ({ url: `${siteConfig.url}/courses/${course.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .8 })),
    ...questionBankCourses.filter((course) => course.available).map((course) => ({ url: `${siteConfig.url}/question-bank/${course.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: .8 })),
    { url: `${siteConfig.url}/question-bank/legacy-hl`, lastModified: new Date(), changeFrequency: "monthly", priority: .6 },
  ];
}
