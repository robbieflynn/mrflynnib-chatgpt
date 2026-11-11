import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync("src/lib/student-accounts.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { currentStudentAccess, matchesStudentAccess } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
const now = Date.parse("2026-11-10T12:00:00Z");
const record = { product_code: "course_ib_aa_hl", source: "stripe", status: "active", starts_at: "2026-01-01", expires_at: "2027-01-01" };
for (const source of ["stripe", "school", "licence", "admin", "promotion", "teachable"]) {
  const records = [{ ...record, source }];
  assert(matchesStudentAccess(records, source, now));
  assert(matchesStudentAccess(records, "plus", now));
  assert(!matchesStudentAccess(records, "free", now));
  if (source !== "stripe") assert(!matchesStudentAccess(records, "stripe", now), "Plus is not evidence of individual payment");
}
assert(!matchesStudentAccess(undefined, "free", now), "Failed reads must not look free");
assert(matchesStudentAccess([], "free", now));
assert(matchesStudentAccess([{ ...record, expires_at: null }], "plus", now));
assert(!matchesStudentAccess([{ ...record, starts_at: "2027-01-01" }], "plus", now));
assert(!matchesStudentAccess([{ ...record, status: "revoked" }], "plus", now));
const expired = { ...record, expires_at: new Date(now).toISOString() };
assert(matchesStudentAccess([expired], "free", now));
assert(matchesStudentAccess([expired], "expired", now));
assert(matchesStudentAccess([expired, record], "plus", now), "An expired course must not hide another active course");
assert.equal(currentStudentAccess([expired, record], now).length, 1);
const page = readFileSync("src/app/teacher/students/page.tsx", "utf8");
assert(page.includes('"license_id,user_id,revoked_at,organization_licenses'), "Seat query must use its composite primary key");
assert(page.includes('request.order("license_id").order("user_id")'), "Pagination must have stable unique ordering");
console.log("PASS: access sources, free/unknown, future/revoked/expired grants, no expiry, overlapping grants and seat pagination");
