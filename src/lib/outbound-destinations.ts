import { courses } from "@/lib/content";
import { siteConfig } from "@/lib/site";

const courseDestination = (shortTitle: string) => courses.find((course) => course.shortTitle === shortTitle)?.teachableUrl ?? "/courses";

export const outboundDestinations = {
  "course-aa-hl": { label: "AA HL access plans", target: courseDestination("AA HL") },
  "course-aa-sl": { label: "AA SL access plans", target: courseDestination("AA SL") },
  "course-ai-hl": { label: "AI HL access plans", target: courseDestination("AI HL") },
  "course-ai-sl": { label: "AI SL access plans", target: courseDestination("AI SL") },
  "my-courses": { label: "your Teachable courses", target: siteConfig.teachableLoginUrl },
  "amazon-book": { label: "the IA book on Amazon", target: siteConfig.bookUrl },
  youtube: { label: "Mr Flynn IB on YouTube", target: siteConfig.youtubeUrl },
  instagram: { label: "Mr Flynn IB on Instagram", target: siteConfig.instagramUrl },
  tiktok: { label: "Mr Flynn IB on TikTok", target: siteConfig.tiktokUrl },
  "ia-complete-guide": {
    label: "the complete IA guide on YouTube",
    target: "https://www.youtube.com/watch?v=pp_CLHH8OgY&list=PLcvv9pSnukaVkFh_OkFceh0aD9Ov02UjV",
  },
  "ia-ideas": {
    label: "IA ideas and modelling on YouTube",
    target: "https://www.youtube.com/watch?v=e5cLTtFzKnI&list=PLcvv9pSnukaVyAMiGPRxJsh6L2wydKFPm",
  },
  "contact-email": { label: "a new email to Mr Flynn IB", target: `mailto:${siteConfig.email}` },
  "tutoring-email": { label: "a tutoring email to Mr Flynn IB", target: `mailto:${siteConfig.email}` },
} as const;

export type OutboundDestination = keyof typeof outboundDestinations;

export function courseCheckoutPath(shortTitle: string) {
  return `/go/course-${shortTitle.toLowerCase().replace(" ", "-")}`;
}
