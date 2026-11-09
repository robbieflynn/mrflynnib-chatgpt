#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { delimiter, dirname } from "node:path";

const checks = [
  ["Lint", "node_modules/eslint/bin/eslint.js", "."],
  ["Whiteboard scribble recognition", "scripts/test-whiteboard-gestures.mjs"],
  ["Assignment whiteboard regression", "scripts/test-assignment-whiteboards.mjs"],
  ["Delayed whiteboard initialisation", "scripts/test-assignment-whiteboards.mjs", "--late-board"],
  ["Question-bank navigation regression", "scripts/test-bank-navigation.mjs"],
  ["Formula booklet regression", "scripts/test-formula-booklets.mjs"],
  ["Question subpart formatting", "scripts/test-question-subparts.mjs"],
  ["Stored answer rendering", "scripts/test-stored-answer-rendering.mjs"],
  ["Fixed assignment-answer audit", "scripts/audit-assignment-choices.mjs"],
  ["Reviewed shared-answer repairs", "scripts/test-shared-answer-repairs.mjs"],
  ["Question-bank delivery audit", "scripts/verify-question-bank-delivery.mjs"],
  ["Course practice delivery", "scripts/test-course-practice-delivery.mjs"],
  ["Production build", "node_modules/next/dist/bin/next", "build", "--webpack"],
];

for (const [label, ...argumentsList] of checks) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, argumentsList, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CI: "true",
      PATH: [dirname(process.execPath), process.env.PATH].filter(Boolean).join(delimiter),
    },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nRelease verification stopped because ${label.toLowerCase()} failed.`);
    process.exit(result.status || 1);
  }
}

console.log("\nRelease verification passed: lint, fixed-answer audit, question-bank delivery audit and production build all succeeded.");
