# Video subtitles

The Bunny player can display English captions without paying Bunny to transcribe the videos. We generate WebVTT caption files separately, check them, and attach them to the existing Bunny videos. Once attached, the existing player exposes its normal **CC** control; the website does not need a second video player.

## Recommended rollout

1. Generate captions for five representative maths lessons.
2. Check mathematical vocabulary, symbols spoken aloud, names and punctuation.
3. Caption the 579 course and IA videos first.
4. Caption the 1,446 past-paper solution videos after the first batch is accepted.
5. Keep the generated `.vtt` files and `state.json`; reruns then skip completed work.

The script is safe by default. `plan` makes no external changes, paid transcription needs `--confirm-paid`, uploads need `--confirm-upload`, and an existing English track is never replaced unless `--replace-existing` is supplied.

## Local transcription (no API transcription charge)

Install `ffmpeg` and `whisper.cpp`, then download an English whisper.cpp model. `small.en` is a practical test model on an 8 GB Apple Silicon Mac; use the pilot to decide whether its maths accuracy is sufficient.

```bash
node scripts/manage-video-captions.mjs \
  --input "/absolute/path/to/lesson.mov" \
  --video-id "BUNNY-VIDEO-UUID" \
  --task generate \
  --engine local \
  --model-path "/absolute/path/to/ggml-small.en.bin"
```

Local generation costs nothing per minute. The first M1 MacBook Air test processed a 5 minute 49 second maths lesson in about two minutes, so the complete 315-hour library would take roughly four to five days of continuous processing on that machine. The job is resumable and can run in batches.

## Direct OpenAI transcription

`whisper-1` produces timestamped WebVTT directly. The script extracts a small mono audio file before upload and never sends the video picture.

OpenAI has scheduled `whisper-1` for retirement on 26 February 2027. It is suitable for this one-off library conversion because the resulting VTT files remain ours and continue working after the model retires; it must not become a permanent runtime dependency of the website. Local whisper.cpp remains the long-term no-API fallback.

```bash
export OPENAI_API_KEY="..."
node scripts/manage-video-captions.mjs \
  --manifest "/absolute/path/to/complete-master-manifest.json" \
  --category "ib_course,igcse_course,internal_assessment" \
  --limit 10 \
  --task generate \
  --engine openai-whisper \
  --confirm-paid
```

The script prints the selected duration and estimated charge before making a paid request. Never store API keys in the repository.

## Review and Bunny upload

Open the generated files under `outputs/video-captions/` and review the pilot. Then provide the Bunny Stream API key through `BUNNY_STREAM_API_KEY` or the local protected file `/private/tmp/mrflynnib-bunny-api-key`.

```bash
export BUNNY_STREAM_API_KEY="..."
node scripts/manage-video-captions.mjs \
  --manifest "/absolute/path/to/complete-master-manifest.json" \
  --category "ib_course,igcse_course,internal_assessment" \
  --task upload \
  --confirm-upload
```

The Bunny library defaults to `775873`. Use `--library-id` only if the videos move to another Stream library.

## Useful planning commands

```bash
# Whole library, read-only
node scripts/manage-video-captions.mjs --manifest "/path/complete-master-manifest.json"

# One category, read-only
node scripts/manage-video-captions.mjs \
  --manifest "/path/complete-master-manifest.json" \
  --category ib_course

# One video, read-only
node scripts/manage-video-captions.mjs \
  --manifest "/path/complete-master-manifest.json" \
  --video-id "BUNNY-VIDEO-UUID"
```

The generated caption directory is ignored by Git because it can contain thousands of files. Back it up with the video-library operations records after the full run.
