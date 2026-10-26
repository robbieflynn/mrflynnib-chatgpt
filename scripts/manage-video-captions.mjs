#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_LIBRARY_ID = "775873";
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), "outputs", "video-captions");
const DEFAULT_MANIFEST = path.join(
  process.cwd(),
  "outputs",
  "video-library-audit",
  "master-storage",
  "complete-master-manifest.json",
);
const DEFAULT_BUNNY_KEY_FILE = "/private/tmp/mrflynnib-bunny-api-key";
const OPENAI_WHISPER_PRICE_PER_MINUTE_USD = 0.006;
const MATH_PROMPT = [
  "IB Mathematics and IGCSE Mathematics lesson.",
  "Use mathematical wording and British English.",
  "Vocabulary may include algebra, calculus, differentiation, integration,",
  "Maclaurin series, logarithm, sine, cosine, tangent, vectors, probability,",
  "binomial distribution, normal distribution, chi-squared, asymptote, domain,",
  "range, inverse function, radians, gradient, intercept, numerator and denominator.",
].join(" ");

function usage(exitCode = 0) {
  console.log(`
Generate and upload English WebVTT captions for Bunny Stream videos.

Safe defaults:
  - The default task is "plan" (no transcription and no upload).
  - Paid transcription requires --confirm-paid.
  - Bunny upload requires --confirm-upload.
  - Existing English caption tracks are preserved unless --replace-existing is used.

Examples:
  node scripts/manage-video-captions.mjs --input "/path/lesson.mov" --video-id UUID --task plan
  node scripts/manage-video-captions.mjs --input "/path/lesson.mov" --video-id UUID \\
    --task generate --engine local --model-path "/path/ggml-small.en.bin"
  node scripts/manage-video-captions.mjs --manifest "/path/complete-master-manifest.json" \\
    --category ib_course,igcse_course --limit 10 --task generate \\
    --engine openai-whisper --confirm-paid
  node scripts/manage-video-captions.mjs --manifest "/path/complete-master-manifest.json" \\
    --task upload --confirm-upload

Options:
  --task plan|generate|upload|both     Default: plan
  --engine local|openai-whisper       Default: local
  --manifest PATH                     Master video manifest
  --input PATH --video-id UUID        Process one local source without a manifest
  --title TEXT                        Optional title for a single input
  --category a,b                      Only selected manifest categories
  --video-id UUID                     Only selected Bunny video (also used with --input)
  --limit N                           Limit selected videos
  --output-dir PATH                   Caption/state output directory
  --model-path PATH                   whisper.cpp model for local generation
  --whisper-bin PATH                  Default: whisper-cli from PATH
  --ffmpeg-bin PATH                   Default: ffmpeg from PATH
  --local-gpu                         Use GPU acceleration (CPU is safer on an 8 GB Mac)
  --language CODE                     Default: en
  --label TEXT                        Default: English
  --confirm-paid                      Permit OpenAI transcription charges
  --confirm-upload                    Permit Bunny caption changes
  --replace-existing                  Replace an existing language track
  --dry-run                           Show actions without running them
  --help                              Show this help
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    task: "plan",
    engine: "local",
    manifest: DEFAULT_MANIFEST,
    outputDir: DEFAULT_OUTPUT_DIR,
    whisperBin: "whisper-cli",
    ffmpegBin: "ffmpeg",
    language: "en",
    label: "English",
    categories: [],
    confirmPaid: false,
    confirmUpload: false,
    replaceExisting: false,
    localGpu: false,
    dryRun: false,
  };
  const booleanFlags = new Set([
    "confirm-paid",
    "confirm-upload",
    "replace-existing",
    "local-gpu",
    "dry-run",
    "help",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (booleanFlags.has(key)) {
      const property = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[property] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    index += 1;
    const property = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    args[property] = value;
  }
  if (args.help) usage();
  if (args.category) args.categories = String(args.category).split(",").map((value) => value.trim()).filter(Boolean);
  if (args.limit !== undefined) {
    args.limit = Number.parseInt(args.limit, 10);
    if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error("--limit must be a positive integer");
  }
  if (!new Set(["plan", "generate", "upload", "both"]).has(args.task)) throw new Error(`Unsupported task: ${args.task}`);
  if (!new Set(["local", "openai-whisper"]).has(args.engine)) throw new Error(`Unsupported engine: ${args.engine}`);
  if (args.input && !args.videoId) throw new Error("--input requires --video-id");
  return args;
}

function firstExistingPath(video) {
  const candidates = [
    video.confirmedPrimarySource,
    video.googleDriveExistingPath,
    video.r2ExistingPath,
    video.googleDriveDestination,
    video.r2Destination,
    video.sourcePath,
    video.input,
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function normalizeManifest(manifestPath) {
  const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.videos || parsed.items || [];
  if (!Array.isArray(rows)) throw new Error("Manifest must be an array or contain a videos/items array");
  return rows.map((video) => ({
    ...video,
    videoId: String(video.videoId || video.guid || video.id || ""),
    title: String(video.title || video.name || video.videoId || video.guid || video.id || "Untitled video"),
    category: String(video.category || "uncategorised"),
    seconds: Number(video.bunnyLengthSeconds || video.lengthSeconds || video.seconds || 0),
    sourcePath: firstExistingPath(video),
  })).filter((video) => video.videoId);
}

function selectVideos(args) {
  let videos;
  if (args.input) {
    const sourcePath = path.resolve(args.input);
    if (!fs.existsSync(sourcePath)) throw new Error(`Input does not exist: ${sourcePath}`);
    videos = [{
      videoId: args.videoId,
      title: args.title || path.basename(sourcePath),
      category: "single",
      seconds: 0,
      sourcePath,
    }];
  } else {
    const manifestPath = path.resolve(args.manifest);
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found: ${manifestPath}\nUse --manifest PATH or --input PATH --video-id UUID.`);
    }
    videos = normalizeManifest(manifestPath);
  }
  if (args.categories.length) videos = videos.filter((video) => args.categories.includes(video.category));
  if (args.videoId && !args.input) videos = videos.filter((video) => video.videoId === args.videoId);
  if (args.limit) videos = videos.slice(0, args.limit);
  return videos;
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: options.quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
    let stdout = "";
    let stderr = "";
    if (options.quiet) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

async function probeDuration(ffmpegBin, sourcePath) {
  const ffprobe = path.join(path.dirname(ffmpegBin), "ffprobe");
  try {
    const { stdout } = await run(ffprobe, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      sourcePath,
    ], { quiet: true });
    return Number.parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

function safeStem(video) {
  return `${video.videoId}-${video.title}`
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function loadState(statePath) {
  if (!fs.existsSync(statePath)) return { version: 1, videos: {} };
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function saveState(statePath, state) {
  const temporaryPath = `${statePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporaryPath, statePath);
}

function validateVtt(filePath) {
  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  if (!content.startsWith("WEBVTT")) throw new Error(`Invalid VTT header: ${filePath}`);
  if (!/\d{2}:\d{2}(?::\d{2})?\.\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?\.\d{3}/.test(content)) {
    throw new Error(`VTT contains no timestamped cues: ${filePath}`);
  }
  return content;
}

function parseTimestamp(value) {
  const parts = value.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function tidyVtt(filePath) {
  const input = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  const rawCues = input.split(/\n\s*\n/).slice(1);
  const cues = rawCues.map((block) => {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) return null;
    const [start, end] = lines[timingIndex].split("-->").map((value) => value.trim().split(" ")[0]);
    return {
      start,
      end,
      startSeconds: parseTimestamp(start),
      endSeconds: parseTimestamp(end),
      text: lines.slice(timingIndex + 1).join(" ").replace(/\s+/g, " ").trim(),
    };
  }).filter((cue) => cue?.text);

  const merged = [];
  for (const cue of cues) {
    const previous = merged.at(-1);
    const shortCue = cue.text.length < 18 || cue.endSeconds - cue.startSeconds < 0.8;
    const contiguous = previous && Math.abs(previous.endSeconds - cue.startSeconds) < 0.08;
    if (shortCue && contiguous && previous.text.length + cue.text.length < 112) {
      previous.end = cue.end;
      previous.endSeconds = cue.endSeconds;
      previous.text = `${previous.text} ${cue.text}`.replace(/\s+/g, " ");
    } else {
      merged.push(cue);
    }
  }

  const output = [
    "WEBVTT",
    "",
    ...merged.flatMap((cue) => [`${cue.start} --> ${cue.end}`, cue.text, ""]),
  ].join("\n");
  fs.writeFileSync(filePath, output);
}

async function extractAudio(args, sourcePath, audioPath) {
  const codecArgs = args.engine === "local"
    ? ["-c:a", "flac", "-compression_level", "8"]
    : ["-c:a", "libmp3lame", "-b:a", "48k"];
  await run(args.ffmpegBin, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", sourcePath,
    "-vn", "-ac", "1", "-ar", "16000",
    ...codecArgs,
    audioPath,
  ]);
}

async function generateLocal(args, audioPath, outputPath) {
  if (!args.modelPath) throw new Error("Local generation requires --model-path PATH");
  if (!fs.existsSync(args.modelPath)) throw new Error(`Whisper model not found: ${args.modelPath}`);
  const outputBase = outputPath.replace(/\.vtt$/i, "");
  const deviceArgs = args.localGpu ? [] : ["--no-gpu"];
  await run(args.whisperBin, [
    "--model", args.modelPath,
    "--file", audioPath,
    "--language", "en",
    "--prompt", MATH_PROMPT,
    "--output-vtt",
    "--output-file", outputBase,
    "--split-on-word",
    "--max-len", "84",
    "--threads", String(Math.max(2, Math.min(6, os.cpus().length - 1))),
    ...deviceArgs,
    "--no-prints",
  ]);
}

async function generateOpenAi(args, audioPath, outputPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for --engine openai-whisper");
  const bytes = fs.readFileSync(audioPath);
  if (bytes.byteLength > 24 * 1024 * 1024) {
    throw new Error(`Extracted audio is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB; split handling is required above 24 MB`);
  }
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "audio/mpeg" }), path.basename(audioPath));
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "vtt");
  form.append("temperature", "0");
  form.append("prompt", MATH_PROMPT);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) throw new Error(`OpenAI transcription failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  fs.writeFileSync(outputPath, await response.text());
}

function readBunnyKey() {
  if (process.env.BUNNY_STREAM_API_KEY) return process.env.BUNNY_STREAM_API_KEY.trim();
  if (fs.existsSync(DEFAULT_BUNNY_KEY_FILE)) return fs.readFileSync(DEFAULT_BUNNY_KEY_FILE, "utf8").trim();
  throw new Error(`BUNNY_STREAM_API_KEY is required (or place it in ${DEFAULT_BUNNY_KEY_FILE})`);
}

async function bunnyRequest(libraryId, apiKey, route, options = {}) {
  const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}${route}`, {
    ...options,
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Bunny request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function uploadCaption(args, video, vttPath) {
  const apiKey = readBunnyKey();
  const libraryId = args.libraryId || DEFAULT_LIBRARY_ID;
  const details = await bunnyRequest(libraryId, apiKey, `/videos/${video.videoId}`);
  const captions = Array.isArray(details?.captions) ? details.captions : [];
  const existing = captions.find((caption) => {
    const language = caption.srclang || caption.language || caption.code;
    return String(language || "").toLowerCase() === args.language.toLowerCase();
  });
  if (existing && !args.replaceExisting) return { skipped: true, reason: "English caption already exists" };
  const captionsFile = Buffer.from(validateVtt(vttPath), "utf8").toString("base64");
  await bunnyRequest(libraryId, apiKey, `/videos/${video.videoId}/captions/${args.language}`, {
    method: "POST",
    body: JSON.stringify({ label: args.label, captionsFile }),
  });
  return { skipped: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = selectVideos(args);
  if (!selected.length) throw new Error("No videos matched the selection");

  for (const video of selected) {
    if (!video.seconds && video.sourcePath) video.seconds = await probeDuration(args.ffmpegBin, video.sourcePath);
  }
  const knownSeconds = selected.reduce((sum, video) => sum + (video.seconds || 0), 0);
  const missingSources = selected.filter((video) => !video.sourcePath).length;
  const estimatedCost = knownSeconds / 60 * OPENAI_WHISPER_PRICE_PER_MINUTE_USD;
  console.log(`Selected: ${selected.length} video(s)`);
  console.log(`Known duration: ${(knownSeconds / 3600).toFixed(2)} hours`);
  console.log(`Available local sources: ${selected.length - missingSources}/${selected.length}`);
  console.log(`OpenAI whisper-1 estimate: $${estimatedCost.toFixed(2)} USD at $${OPENAI_WHISPER_PRICE_PER_MINUTE_USD.toFixed(3)}/minute`);

  if (args.task === "plan" || args.dryRun) {
    for (const video of selected.slice(0, 25)) {
      console.log(`${video.videoId} | ${video.category} | ${Math.round(video.seconds || 0)}s | ${video.sourcePath || "SOURCE MISSING"} | ${video.title}`);
    }
    if (selected.length > 25) console.log(`...and ${selected.length - 25} more`);
    if (args.task === "plan") return;
  }

  fs.mkdirSync(args.outputDir, { recursive: true });
  const statePath = path.join(args.outputDir, "state.json");
  const state = loadState(statePath);

  const shouldGenerate = args.task === "generate" || args.task === "both";
  const shouldUpload = args.task === "upload" || args.task === "both";
  if (shouldGenerate && args.engine === "openai-whisper" && !args.confirmPaid) {
    throw new Error("Paid transcription is blocked. Review the estimate, then rerun with --confirm-paid.");
  }
  if (shouldUpload && !args.confirmUpload) {
    throw new Error("Bunny upload is blocked. Rerun with --confirm-upload after reviewing the generated VTT files.");
  }
  if (args.dryRun) return;

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const [index, video] of selected.entries()) {
    const stem = safeStem(video);
    const vttPath = path.join(args.outputDir, `${stem}.vtt`);
    const record = state.videos[video.videoId] || { title: video.title, category: video.category };
    state.videos[video.videoId] = record;
    console.log(`\n[${index + 1}/${selected.length}] ${video.title} (${video.videoId})`);
    try {
      if (shouldGenerate && !fs.existsSync(vttPath)) {
        if (!video.sourcePath) throw new Error("No local source file is available");
        const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "mrflynn-captions-"));
        const audioPath = path.join(temporaryDir, args.engine === "local" ? "audio.flac" : "audio.mp3");
        try {
          console.log("Extracting audio...");
          await extractAudio(args, video.sourcePath, audioPath);
          console.log(`Generating captions with ${args.engine}...`);
          if (args.engine === "local") await generateLocal(args, audioPath, vttPath);
          else await generateOpenAi(args, audioPath, vttPath);
          tidyVtt(vttPath);
          validateVtt(vttPath);
          record.generatedAt = new Date().toISOString();
          record.engine = args.engine;
          record.vttPath = vttPath;
          saveState(statePath, state);
        } finally {
          fs.rmSync(temporaryDir, { recursive: true, force: true });
        }
      } else if (shouldGenerate) {
        validateVtt(vttPath);
        console.log("Using existing VTT (resumable skip).");
      }

      if (shouldUpload) {
        if (!fs.existsSync(vttPath)) throw new Error(`Caption file is missing: ${vttPath}`);
        console.log("Checking/uploading Bunny caption track...");
        const result = await uploadCaption(args, video, vttPath);
        if (result.skipped) {
          console.log(`Skipped: ${result.reason}`);
          skipped += 1;
        } else {
          record.uploadedAt = new Date().toISOString();
          console.log("Uploaded English caption track.");
        }
        saveState(statePath, state);
      }
      succeeded += 1;
    } catch (error) {
      failed += 1;
      record.lastError = String(error?.message || error);
      record.failedAt = new Date().toISOString();
      saveState(statePath, state);
      console.error(`Failed: ${record.lastError}`);
    }
  }

  console.log(`\nFinished. Successful: ${succeeded}; skipped uploads: ${skipped}; failed: ${failed}.`);
  console.log(`State: ${statePath}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
