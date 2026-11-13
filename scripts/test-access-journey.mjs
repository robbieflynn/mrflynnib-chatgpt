import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const app = fs.readFileSync('public/learn/app.js', 'utf8');
const fn = app.slice(app.indexOf('function plusAccessHref()'), app.indexOf('\nfunction showPlusPrompt()'));
for (const role of ['student', 'teacher', 'admin']) {
  for (const course of ['aa-hl', 'aa-sl', 'ai-hl', 'ai-sl', 'igcse']) {
    const curriculum = course === 'igcse' ? 'igcse' : 'ib';
    const result = vm.runInNewContext(`${fn}; plusAccessHref()`, {platformAccount:{curriculum,user:{role}},currentCourseId:course,guestMode:false});
    assert.equal(result, curriculum === 'igcse' ? '/igcse/account/access?course=igcse' : role === 'student' ? `/account/access?course=${course}` : '/teacher/access');
  }
}
assert.equal(vm.runInNewContext(`${fn}; plusAccessHref()`, {platformAccount:null,currentCourseId:'ai-sl',guestMode:true}), '/plus?course=ai-sl');
const source = fs.readFileSync('src/lib/platform-access.ts','utf8');
const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context = {exports:{}};
vm.runInNewContext(output,context);
const summary = context.exports.platformAccessSummary;
const now = new Date('2026-11-13T00:00:00Z');
const entitlement = code => ({product_code:code,status:'active',starts_at:'2026-01-01',expires_at:'2027-01-01'});
assert.equal(summary([],[],now,'ib').label,'Standard account');
assert.equal(summary([entitlement('course_ib_ai_sl')],[],now,'ib').label,'Student Plus · AI SL');
assert.equal(summary([entitlement('teacher_plus_ib')],[],now,'ib').label,'Teacher Plus · all four IB courses');
assert.equal(summary([entitlement('teacher_plus_ib')],[],now,'igcse').paid,false);
assert.equal(summary([{...entitlement('course_ib_aa_hl'),expires_at:'2026-01-02'}],[],now,'ib').paid,false);
console.log('Passed: role/course routing, guest intent, access labels, expiry and curriculum isolation.');
