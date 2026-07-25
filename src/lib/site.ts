export const siteConfig = {
  name: "Mr Flynn IB",
  legalName: "Mr Flynn IB",
  domain: "mrflynnib.com",
  description:
    "Clear, expert-led IB Mathematics courses, tutoring, resources and school licences from Rob Flynn.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mrflynnib.com",
  youtubeUrl:
    process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://www.youtube.com/@YOUR_CHANNEL",
  bookUrl: process.env.NEXT_PUBLIC_BOOK_URL ?? "#book-link-needed",
  teachableSchoolUrl:
    process.env.NEXT_PUBLIC_TEACHABLE_SCHOOL_URL ?? "#teachable-school-url-needed",
  teachableLoginUrl:
    process.env.NEXT_PUBLIC_TEACHABLE_LOGIN_URL ?? "#teachable-login-url-needed",
  email: "hello@mrflynnib.com",
} as const;

export const navItems = [
  { label: "Courses", href: "/courses" },
  { label: "Free resources", href: "/resources" },
  { label: "Tutoring", href: "/tutoring" },
  { label: "Schools", href: "/schools" },
  { label: "Book", href: "/book" },
  { label: "About", href: "/about" },
] as const;
