import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import videoAccess from "@/data/course-video-access.json";
import { getCourseProduct } from "@/lib/platform-products";

type VideoCourse = { lessons: string[]; samples: string[]; pastPapers: string[]; freePastPapers?: string[] };

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("course") || "";
  const videoId = url.searchParams.get("video") || "";
  const kind = url.searchParams.get("kind") === "past-paper" ? "pastPapers" : "lessons";
  const course = getCourseProduct(courseId);
  const map = (videoAccess.courses as Record<string, VideoCourse>)[courseId];

  if (!course || !map || !map[kind].includes(videoId)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || videoAccess.libraryId;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!libraryId || !tokenKey) {
    return NextResponse.json({ error: "Video preview is temporarily unavailable" }, { status: 503 });
  }

  const expires = Math.floor(Date.now() / 1000) + 5 * 60;
  const token = createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
  const playerUrl = new URL(`https://player.mediadelivery.net/embed/${libraryId}/${videoId}`);
  playerUrl.searchParams.set("token", token);
  playerUrl.searchParams.set("expires", String(expires));
  playerUrl.searchParams.set("autoplay", "false");

  const playerResponse = await fetch(playerUrl, { cache: "no-store" });
  if (!playerResponse.ok) {
    return NextResponse.json({ error: "Video preview is temporarily unavailable" }, { status: 502 });
  }

  const playerHtml = await playerResponse.text();
  const escapedVideoId = videoId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const thumbnailMatch = playerHtml.match(new RegExp(`https://[^"'<>\\s]+/${escapedVideoId}/thumbnail\\.jpg`));
  if (!thumbnailMatch) {
    return NextResponse.json({ error: "Video preview is temporarily unavailable" }, { status: 404 });
  }

  const thumbnailUrl = new URL(thumbnailMatch[0].replaceAll("&amp;", "&").replaceAll("\\u0026", "&"));
  if (!thumbnailUrl.hostname.endsWith(".b-cdn.net") || !thumbnailUrl.pathname.endsWith(`/${videoId}/thumbnail.jpg`)) {
    return NextResponse.json({ error: "Video preview is temporarily unavailable" }, { status: 502 });
  }

  const thumbnailResponse = await fetch(thumbnailUrl, {
    cache: "no-store",
    headers: {
      Referer: playerUrl.toString(),
      "User-Agent": "Mozilla/5.0 (compatible; MrFlynnIB-VideoPreview/1.0)",
    },
  });
  if (!thumbnailResponse.ok) {
    return NextResponse.json({ error: "Video preview is temporarily unavailable" }, { status: 502 });
  }

  return new NextResponse(await thumbnailResponse.arrayBuffer(), {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": thumbnailResponse.headers.get("content-type") || "image/jpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
