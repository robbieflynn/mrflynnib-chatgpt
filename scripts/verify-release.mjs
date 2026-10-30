#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { delimiter, dirname } from "node:path";

const checks = [
  ["Lint", "node_modules/eslint/bin/eslint.js", "."],
  ["Fixed assignment-answer audit", "scripts/audit-assignment-choices.mjs"],
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

console.log("\nRelease verification passed: lint, fixed-answer audit and production build all succeeded.");
