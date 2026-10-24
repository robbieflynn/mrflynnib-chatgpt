import { readFile } from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const inputPath = process.argv.find((argument) => argument.startsWith("--input="))?.slice(8);
const apply = process.argv.includes("--apply");

if (!inputPath) {
  throw new Error("Use --input=/absolute/path/to/paid-eligible-private.json.");
}

const approvedEvidence = new Set([
  "paid_transaction_and_active_enrollment",
  "coupon_user_and_active_enrollment",
  "approved_school_domain_and_active_enrollment",
]);
const approvedProducts = new Set([
  "course_ib_aa_hl",
  "course_ib_aa_sl",
  "course_ib_ai_hl",
  "course_ib_ai_sl",
  "course_igcse",
]);
const rows = JSON.parse(await readFile(inputPath, "utf8"));
if (!Array.isArray(rows)) throw new Error("The migration input must be a JSON array.");

const now = new Date();
const preparedByEmailAndProduct = new Map();
const rejected = { invalid_email: 0, invalid_product: 0, invalid_evidence: 0, expired: 0, invalid_dates: 0 };
let duplicateRecordsCollapsed = 0;

for (const row of rows) {
  const normalizedEmail = String(row.email ?? "").trim().toLowerCase();
  const productCode = String(row.product_code ?? "");
  const evidenceType = String(row.evidence ?? "");
  const startsAt = new Date(row.enrolled_at ?? now.toISOString());
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;

  if (!normalizedEmail.includes("@")) { rejected.invalid_email += 1; continue; }
  if (!approvedProducts.has(productCode)) { rejected.invalid_product += 1; continue; }
  if (!approvedEvidence.has(evidenceType)) { rejected.invalid_evidence += 1; continue; }
  if (Number.isNaN(startsAt.getTime()) || (expiresAt && Number.isNaN(expiresAt.getTime()))) { rejected.invalid_dates += 1; continue; }
  if (expiresAt && expiresAt <= now) { rejected.expired += 1; continue; }
  if (expiresAt && expiresAt <= startsAt) { rejected.invalid_dates += 1; continue; }

  const source = evidenceType === "approved_school_domain_and_active_enrollment" ? "school" : "teachable";
  const candidate = {
    normalized_email: normalizedEmail,
    product_code: productCode,
    source,
    evidence_type: evidenceType,
    external_reference: `teachable:${Number(row.course_id)}:${Number(row.user_id)}`,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt?.toISOString() ?? null,
    status: "verified",
    metadata: {
      teachable_course_id: Number(row.course_id),
      teachable_user_id: Number(row.user_id),
    },
    updated_at: now.toISOString(),
  };
  const key = `${normalizedEmail}:${productCode}`;
  const existing = preparedByEmailAndProduct.get(key);
  if (existing) {
    duplicateRecordsCollapsed += 1;
    const existingExpiry = existing.expires_at ? new Date(existing.expires_at).getTime() : Number.POSITIVE_INFINITY;
    const candidateExpiry = candidate.expires_at ? new Date(candidate.expires_at).getTime() : Number.POSITIVE_INFINITY;
    if (candidateExpiry > existingExpiry) preparedByEmailAndProduct.set(key, candidate);
  } else {
    preparedByEmailAndProduct.set(key, candidate);
  }
}

const prepared = [...preparedByEmailAndProduct.values()];
const counts = prepared.reduce((summary, row) => {
  summary[row.evidence_type] = (summary[row.evidence_type] ?? 0) + 1;
  return summary;
}, {});
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", input: rows.length, prepared: prepared.length, duplicate_records_collapsed: duplicateRecordsCollapsed, rejected, evidence: counts }, null, 2));

if (!apply) {
  console.log("Dry run only. Add --apply after reviewing the counts.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Supabase URL and server key are required for --apply.");

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
for (let start = 0; start < prepared.length; start += 100) {
  const batch = prepared.slice(start, start + 100);
  const { error } = await supabase.from("course_access_migrations").upsert(batch, {
    onConflict: "normalized_email,product_code",
  });
  if (error) throw new Error(`Import failed after ${start} records: ${error.message}`);
}

console.log(JSON.stringify({ imported: prepared.length }, null, 2));
