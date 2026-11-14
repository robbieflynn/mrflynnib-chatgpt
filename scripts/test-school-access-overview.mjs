import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const registry = compile(readFileSync('src/lib/approved-schools.ts', 'utf8'));
const loader = compile(readFileSync('src/lib/school-access-overview.ts', 'utf8')).replace(/import .* from "\.\/approved-schools";\n/, '');
const { loadApprovedSchoolAccounts, approvedSchools } = await import(`data:text/javascript;base64,${Buffer.from(registry + loader).toString('base64')}`);

function client(rows, responses = []) {
  const calls = [];
  const api = {
    from(table) { assert.equal(table, 'platform_entitlements'); return this; },
    select(fields, options) { assert.equal(options.count, 'exact'); assert.equal(fields, 'id,user_id,metadata'); return this; },
    eq(key, value) { calls.push([key, value]); return this; },
    lte(key, value) { assert.equal(key, 'starts_at'); assert.ok(!Number.isNaN(Date.parse(value))); return this; },
    or(filter) { assert.match(filter, /^expires_at.is.null,expires_at.gt./); return this; },
    order(key) { assert.equal(key, 'id'); return this; },
    range(start, end) { return Promise.resolve(responses.shift() ?? { data: rows.slice(start, end + 1), error: null, count: rows.length }); },
  };
  return { api, calls };
}
const rows = Array.from({ length: 1203 }, (_, i) => ({ id: String(i), user_id: `student-${i}`, metadata: { domain: 'jess.sch.ae' } }));
rows.push({ id: 'duplicate', user_id: 'student-0', metadata: { domain: 'jess.sch.ae' } });
rows.push({ id: 'beau', user_id: 'beau-student', metadata: { domain: 'beausoleil.ch' } });
const source = client(rows);
const summary = await loadApprovedSchoolAccounts(source.api);
assert.equal(summary.get('jess.sch.ae').size, 1203, 'all pages and distinct people are counted');
assert.equal(summary.get('beausoleil.ch').size, 1);
assert.equal(summary.get('westminsteracademy.org.uk').size, 0);
assert.ok(source.calls.some(([key,value]) => key === 'status' && value === 'active'));
assert.ok(source.calls.some(([key,value]) => key === 'external_provider' && value === 'school-domain'));
assert.equal((await loadApprovedSchoolAccounts(client([]).api)).size, approvedSchools.length);
assert.equal(await loadApprovedSchoolAccounts(client([], [{ data: null, error: { message: 'unavailable' }, count: null }]).api), null, 'failed reads must not report zero schools');
assert.equal(await loadApprovedSchoolAccounts(client([], [{ data: rows.slice(0,500), error:null, count:1203 }, { data: [], error:null, count:1203 }]).api), null, 'incomplete result must not report a partial total');
assert.equal(await loadApprovedSchoolAccounts(client([], [{ data: rows.slice(0,500), error:null, count:1203 }, { data: rows.slice(500,1000), error:null, count:1204 }]).api), null, 'a changing snapshot must be retried');
console.log('PASS: distinct school accounts, multi-page totals, access filtering, empty results and failed/incomplete reads.');
