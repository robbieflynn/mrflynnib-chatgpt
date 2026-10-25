import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import videoAccess from "@/data/course-video-access.json";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct } from "@/lib/platform-products";

type VideoCourse = { lessons: string[]; samples: string[]; pastPapers: string[]; freePastPapers?: string[] };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("course") || "";
  const videoId = url.searchParams.get("video") || "";
  const kind = url.searchParams.get("kind") === "past-paper" ? "pastPapers" : "lessons";
  const course = getCourseProduct(courseId);
  const map = (videoAccess.courses as Record<string, VideoCourse>)[courseId];
  if (!course || !map || !map[kind].includes(videoId)) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  const isSample = kind === "lessons"
    ? map.samples.includes(videoId)
    : Boolean(map.freePastPapers?.includes(videoId));
  if (!isSample) {
    const session = await getPlatformAccess();
    if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    if (course.curriculum !== session.curriculum && session.profile?.role !== "admin") return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const ownsCourse = session.ownedCourses.some((item) => item.id === courseId);
    if (!ownsCourse) return NextResponse.json({ error: "Full course access required", upgrade: course.curriculum === "igcse" ? "/igcse/account/access" : "/account/access" }, { status: 403 });
  }
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || videoAccess.libraryId;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!libraryId || !tokenKey) {
    return NextResponse.json({ error: "Secure video playback is temporarily unavailable" }, { status: 503 });
  }
  const expires = Math.floor(Date.now() / 1000) + 5 * 60;
  const token = createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
  const query = new URLSearchParams({ autoplay: "false", loop: "false", muted: "false", preload: "true", responsive: "true" });
  query.set("token", token);
  query.set("expires", String(expires));
  return NextResponse.json({ url: `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?${query}` }, {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
