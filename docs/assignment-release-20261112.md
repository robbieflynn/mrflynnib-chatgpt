# Assignment release, 12 November 2026

Approved by Rob: publish second attempts, reviewed IB solve answers and teacher-controlled hints.

Release branch starts from ca9c00a47 (live pen fixes), merges the existing combined hints preview, and retains all current main changes. Existing PRs #244 and #246 are included in #250.

Validation: full verify:release passed; all 59,025 stored choices rendered; hint browser/API tests and isolated PostgreSQL tests passed. Authenticated QA: returned hint history, next reveal, refresh persistence, teacher counts, disable setting; first-wrong retry and correct second attempt; consecutive multipart answers and question/part navigation. These checks use disposable QA assignments, not student classroom work.

Database: six existing assignment-question copies upgraded, across five question IDs. Rehearsed with rollback first; application included before/after checksums protecting responses, progress, submissions and submitted-whiteboard snapshots. Postflight: zero remaining eligible copies and no invalid key shapes. The hint schema was already installed on 10 November.
