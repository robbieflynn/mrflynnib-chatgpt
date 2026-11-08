# Shared-answer repairs — 8 November 2026

Preview-only branch: `codex/shared-answer-fixes`. No production deployment or database migration has been performed.

## Changes

- Correct the original 59 audit findings across 39 questions, with 49 reviewed multiple-choice definitions and eight drawing/justification responses using whiteboards. Five false subparts become two complete parent questions, so the configuration has 57 reviewed definitions rather than 60.
- Include one additional incomplete answer found during local browser review: `A_M24TZ1SL_P2_Q9` part (c) requires **both 20.3 m and 12.5 m**, not just 20.3 m. Both lengths were independently calculated from the stated area and cosine-rule equations. Total findings addressed: **60**, still across **39 questions**.
- Preserve the 116 unaffected subparts in the original audit, and all 5,192 other question configurations.
- Require explicit review when an active question uses a new or changed shared mark-scheme source. Fingerprints cover the question body/title, parent prompt and shared rows; this prevents unchanged approvals silently accepting edited source material. This is a bounded safeguard, not proof that every mathematical answer in the bank is correct.
- Keep saved whiteboard parts accessible and include them in subsequent saves even if the corrected question no longer contains those old labels.

## Verification

The focused regression checks independently calculate representative numerical answers, including both ambiguous-triangle solutions and conditional probability. Symbolic and complete-set expectations are recorded separately from the extractor. They check all original audit decisions, preserve all 116 unaffected audited siblings, and render the answer options through KaTeX.

The real question renderer was opened locally in a test fixture with no account or student data. The derivative choices were checked against the first-derivative prompt. Both angle solutions and both length solutions were seen in the rendered triangle question. This was **not** an authenticated live-site or Vercel-preview save/submit check.

Whiteboard regression coverage includes old part labels remaining navigable and being retained when the corrected part is edited and saved, as well as the existing multipart/read-only/delayed-load/tool tests.

Run `node scripts/verify-release.mjs` for the complete release gate, including lint, gesture/whiteboard/navigation tests, full catalogue generation comparison, the new answer regressions, delivery/practice checks and production build.

## Existing assignments

`supabase/migrations/20261108_repair_shared_subpart_answers.sql` is prepared but **not applied**. It changes only the reviewed answer-key entries and response options, scoped by curriculum and question ID. Unrelated part definitions remain intact. The migration is idempotent and retains all student responses, attempt history, submitted status, marks, progress and whiteboard documents.

Existing graded or locked attempts are not silently regraded or reset. Those require teacher review; this change does not claim to have corrected historical scores or reopened exhausted attempts. An authenticated save/check/submit verification is still required against the deployment and database repair before production rollout is called complete.
