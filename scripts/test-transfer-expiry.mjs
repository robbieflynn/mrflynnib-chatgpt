import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync('src/app/teacher/access-claims/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let migration = null, saved = null, reviewed = false, grantError = false;
const admin = { from(table) {
  const query = { select() { return query; }, eq() { return query; }, async maybeSingle() { return { data: table === 'course_access_claims' ? { id: 'claim', user_id: 'user', email: 'member@example.com', product_code: 'course_ib_aa_hl', status: 'pending' } : migration }; }, async upsert(value) { saved = value; return { error: grantError }; }, update() { reviewed = true; return { async eq() { return {}; } }; } };
  return query;
} };
const out = {};
new Function('require', 'exports', code)((name) => {
  if (name === 'next/navigation') return { redirect: (url) => { throw new Error(url); } };
  if (name === 'next/cache') return { revalidatePath() {} };
  if (name.includes('account-access')) return { requireAdmin: async () => ({ user: { id: 'admin' } }) };
  return { createAdminClient: () => admin };
}, out);
const run = async (fields = {}) => { saved = null; reviewed = false; const form = new FormData(); Object.entries({ claimId: 'claim', decision: 'approved', ...fields }).forEach(([key, value]) => form.set(key, value)); return out.reviewAccessClaim(form); };
await assert.rejects(run(), /error=expiry/); assert.equal(saved, null); assert.equal(reviewed, false);
await assert.rejects(run({ originalExpiry: 'invalid' }), /error=expiry/);
await assert.rejects(run({ originalExpiry: '2020-01-01T00:00:00' }), /error=expiry/);
await run({ originalExpiry: '2090-09-16T07:22:02' }); assert.equal(saved.expires_at, '2090-09-16T07:22:02Z'); assert.equal(reviewed, true);
await run({ verifiedNoExpiry: 'on' }); assert.equal(saved.expires_at, null);
migration = { status: 'verified', starts_at: '2026-01-01T00:00:00Z', expires_at: '2090-09-16T07:22:02Z' };
await run({ verifiedNoExpiry: 'on' }); assert.equal(saved.expires_at, migration.expires_at); assert.equal(saved.starts_at, migration.starts_at);
migration = { ...migration, expires_at: '2020-01-01T00:00:00Z' };
await assert.rejects(run({ verifiedNoExpiry: 'on' }), /error=expiry/); assert.equal(reviewed, false);
migration = null; grantError = true;
await assert.rejects(run({ verifiedNoExpiry: 'on' }), /error=save/); assert.equal(reviewed, false);
console.log('Transfer approvals preserve imported dates, require evidence, reject expired access and do not approve failed grants.');
