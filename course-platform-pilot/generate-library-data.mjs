import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const libraryId = "775873";
const apiKey = execFileSync("pbpaste", { encoding: "utf8" }).trim();

if (!apiKey) {
  throw new Error("The Bunny API key is not available in the clipboard.");
}

const headers = { AccessKey: apiKey };
const apiRoot = `https://video.bunnycdn.com/library/${libraryId}`;
const [videoResponse, collectionResponse] = await Promise.all([
  fetch(`${apiRoot}/videos?page=1&itemsPerPage=1000`, { headers }),
  fetch(`${apiRoot}/collections?page=1&itemsPerPage=1000`, { headers }),
]);

if (!videoResponse.ok || !collectionResponse.ok) {
  throw new Error(`Bunny metadata request failed (${videoResponse.status}/${collectionResponse.status}).`);
}

const videoPayload = await videoResponse.json();
const collectionPayload = await collectionResponse.json();
const collectionNames = new Map(collectionPayload.items.map((collection) => [collection.guid, collection.name]));

const cleanTitle = (title) => title.replace(/\.(mov|m4v|mp4|avi|mkv|webm)$/i, "").trim();
const splitTitle = (title) => {
  const cleaned = cleanTitle(title);
  const match = cleaned.match(/^(\d+(?:\.\d+){0,2})\s*(.*)$/);
  return match ? { code: match[1], title: match[2] } : { code: "", title: cleaned };
};

const naturalSort = (a, b) => {
  const first = `${a.code} ${a.title}`;
  const second = `${b.code} ${b.title}`;
  return first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" });
};

const collections = {};
for (const video of videoPayload.items) {
  const collectionName = collectionNames.get(video.collectionId);
  if (!collectionName) continue;
  const parsed = splitTitle(video.title);
  const lesson = {
    id: video.guid,
    code: parsed.code,
    title: parsed.title,
    seconds: Number(video.length) || 0,
    status: Number(video.status),
  };
  (collections[collectionName] ??= []).push(lesson);
}

for (const lessons of Object.values(collections)) lessons.sort(naturalSort);

const data = {
  libraryId,
  generatedAt: new Date().toISOString(),
  stats: {
    videos: videoPayload.items.length,
    seconds: videoPayload.items.reduce((sum, video) => sum + (Number(video.length) || 0), 0),
    storageBytes: videoPayload.items.reduce((sum, video) => sum + (Number(video.storageSize) || 0), 0),
  },
  topicNames: {
    1: "Number and algebra",
    2: "Functions",
    3: "Geometry and trigonometry",
    4: "Statistics and probability",
    5: "Calculus",
  },
  collections,
};

const output = `window.MR_FLYNN_LIBRARY = ${JSON.stringify(data, null, 2)};\n`;
writeFileSync(new URL("./dist/library-data.js", import.meta.url), output);
console.log(`Generated library data for ${data.stats.videos} videos across ${Object.keys(collections).length} collections.`);
