export const siteConfig = {
  name: "Mr Flynn IB",
  legalName: "Mr Flynn IB",
  domain: "mrflynnib.com",
  description:
    "Clear IB Mathematics courses, a growing question bank, IA guidance, tutoring and school licences from Mr Flynn IB.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mrflynnib.com",
  youtubeUrl:
    process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://www.youtube.com/mrflynnib",
  instagramUrl: "https://www.instagram.com/mrflynnib/",
  tiktokUrl: "https://www.tiktok.com/@mrflynnib/",
  bookUrl: process.env.NEXT_PUBLIC_BOOK_URL ?? "https://www.amazon.ae/dp/1068444231",
  teachableLoginUrl:
    process.env.NEXT_PUBLIC_TEACHABLE_LOGIN_URL ?? "https://learn.mrflynnib.com/sign_in",
  email: "contact@mrflynnib.com",
} as const;

export const navItems = [
  { label: "Courses", href: "/courses" },
  { label: "IA guidance", href: "/ia" },
  { label: "Question bank", href: "/question-bank" },
  { label: "Schools", href: "/schools" },
  { label: "Book", href: "/book" },
] as const;
