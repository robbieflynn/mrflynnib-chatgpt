import type { MetadataRoute } from "next";
import { courses, resources } from "@/lib/content";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/courses", "/resources", "/tutoring", "/schools", "/book", "/about", "/results", "/contact", "/faq", "/privacy", "/terms", "/cookies"];
  return [
    ...staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : .7 })),
    ...courses.map((course) => ({ url: `${siteConfig.url}/courses/${course.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .8 })),
    ...resources.map((resource) => ({ url: `${siteConfig.url}/resources/${resource.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: .65 })),
  ];
}
