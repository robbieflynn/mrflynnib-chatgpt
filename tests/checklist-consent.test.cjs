/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function loadTs(path, imports) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)((name) => imports[name], loaded, loaded.exports);
  return loaded.exports;
}
const security = loadTs('src/lib/request-security.ts', { 'next/server': { NextResponse } });
const { POST } = loadTs('src/app/api/checklist-signup/route.ts', {
  'next/server': { NextResponse }, '@/lib/request-security': security,
});

test('checklist delivery and marketing consent stay independent', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const calls = [];
  process.env.MAILERLITE_API_TOKEN = 'test-only';
  process.env.MAILERLITE_CHECKLIST_GROUP_ID = 'delivery';
  process.env.MAILERLITE_MARKETING_GROUP_ID = 'marketing';
  global.fetch = async (_url, options) => { calls.push(JSON.parse(options.body)); return new Response('{}', { status: 201 }); };
  let requestId = 0;
  const submit = (body) => POST(new Request('https://example.com/api/checklist-signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `test-${requestId++}` }, body: JSON.stringify(body),
  }));
  const base = { name: 'Test', email: 'TEST@example.com', course: 'AA HL' };
  try {
    for (const course of ['AA HL', 'AA SL', 'AI HL', 'AI SL']) {
      for (const marketingConsent of [false, true]) {
        assert.equal((await submit({ ...base, course, marketingConsent })).status, 200);
        const payload = calls.at(-1);
        assert.ok(payload.groups.includes('delivery'));
        assert.equal(payload.groups.includes('marketing'), marketingConsent);
        assert.equal('opted_in_at' in payload, marketingConsent);
        assert.equal(payload.email, 'test@example.com');
        assert.equal('status' in payload, false);
        assert.equal('resubscribe' in payload, false);
      }
    }
    await submit(base);
    assert.equal(calls.at(-1).groups.includes('marketing'), false);
    const before = calls.length;
    for (const marketingConsent of ['false', 'true', 1, null]) {
      assert.equal((await submit({ ...base, marketingConsent })).status, 400);
    }
    assert.equal((await submit(null)).status, 400);
    assert.equal(calls.length, before);
    delete process.env.MAILERLITE_MARKETING_GROUP_ID;
    assert.equal((await submit(base)).status, 200);
    assert.equal((await submit({ ...base, marketingConsent: true })).status, 503);
    process.env.MAILERLITE_MARKETING_GROUP_ID = 'delivery';
    assert.equal((await submit(base)).status, 503);
    delete process.env.MAILERLITE_CHECKLIST_GROUP_ID;
    assert.equal((await submit(base)).status, 503);
  } finally {
    global.fetch = originalFetch;
    for (const key of ['MAILERLITE_API_TOKEN', 'MAILERLITE_CHECKLIST_GROUP_ID', 'MAILERLITE_MARKETING_GROUP_ID']) {
      if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
    }
  }
});
