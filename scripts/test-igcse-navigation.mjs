import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('public/learn/index.html', 'utf8');
const earlyNavigation = readFileSync('public/learn/navigation.js', 'utf8');
const app = readFileSync('public/learn/app.js', 'utf8');
const libraries = ['library-data.js', 'igcse-library-data.js', 'past-paper-data.js', 'igcse-past-paper-data.js', 'practice-data.js'];
for (const curriculum of ['igcse', 'ib']) {
  for (const role of ['student', 'teacher']) {
    const course = curriculum === 'igcse' ? 'igcse' : 'aa-sl';
    const base = curriculum === 'igcse' ? '/igcse' : '';
    const dom = new JSDOM(html, { url: `https://example.test/learn/index.html?curriculum=${curriculum}&course=${course}`, runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    w.matchMedia = () => ({ matches: false, addEventListener() {} });
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.scrollTo = () => {};
    w.localStorage.setItem('mrflynnib-course-platform-v3', JSON.stringify({ completed: [], lastCourse: 'aa-hl', lastLesson: 'old-ib-lesson' }));
    let resolveBootstrap;
    const pending = new Promise(resolve => { resolveBootstrap = resolve; });
    w.fetch = async url => String(url).includes('/bootstrap') ? pending : { ok: true, json: async () => ({}) };
    w.eval(earlyNavigation);
    const href = id => w.document.getElementById(id).getAttribute('href');
    if (curriculum === 'igcse') {
      assert.equal(href('questionBankLink'), '/igcse/question-bank', 'IGCSE links must be safe before data or authentication loads');
      assert.equal(href('courseBackButton'), '/igcse/account');
    }
    for (const name of libraries) w.eval(readFileSync(`public/learn/${name}`, 'utf8'));
    w.eval(app);
    resolveBootstrap({ ok: true, status: 200, json: async () => ({
      curriculum, user: { displayName: 'Navigation test', initials: 'NT', role },
      availableCourseIds: curriculum === 'igcse' ? ['igcse', 'aa-hl'] : ['aa-sl', 'aa-hl'],
      ownedCourseIds: ['aa-hl', course], preferredCourseId: 'aa-hl',
      state: { last_course_id: 'aa-hl' }, progress: [], starredQuestionIds: [], access: { label: 'Plus' },
      links: { account: `${base}/account`, access: `${base}/account/access`, assignments: `${base}/assignments` },
    }) });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(href('questionBankLink'), curriculum === 'igcse' ? '/igcse/question-bank' : '/question-bank/aa-sl');
    for (const id of ['courseBackButton', 'learningHomeLink', 'primaryLearningHomeLink', 'topbarLearningHomeLink', 'brandLearningHomeLink']) assert.equal(href(id), `${base}/${role === "teacher" ? "teacher" : "account"}`, `${curriculum} ${role}: ${id}`);
    assert.equal(href('assignmentsLink'), `${base}/assignments`);
    if (curriculum === 'igcse') assert.equal(w.document.getElementById('teacherCourseSwitcher').hidden, true);
    dom.window.close();
  }
}
console.log('PASS: IGCSE and IB student/teacher course navigation, delayed account loading, conflicting IB saved state and mixed entitlements.');

// Exercise the server page routing with authorised fixture records; no real student data is changed.
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let recordBank = 'igcse';
let signInArgs;
const query = table => {
  const data = table === 'assignments'
    ? { id: 'test-assignment', title: 'Test task', classes: { bank: recordBank, name: 'Test class', course: 'AA SL' } }
    : table === 'class_memberships' ? [{ class_id: 'class-1', classes: { bank: recordBank, name: 'Test class' } }] : [];
  const result = { data, error: null };
  const chain = new Proxy({}, { get: (_, name) => name === 'then' ? (resolve => resolve(result)) : () => chain });
  return chain;
};
function loadPage(file, exportedName) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const mockRequire = name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: props => React.createElement('a', props) };
    if (name === 'next/navigation') return { redirect: url => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error('not-found'); } };
    if (name.endsWith('/account-access')) return { requireSignedIn: async (...args) => { signInArgs = args; return { user: { id: 'test-user' }, supabase: { from: query } }; } };
    if (name.endsWith('/question-bank-courses')) return { getQuestionBankCourseByCode: () => ({ code: 'AA SL' }) };
    if (name.endsWith('/assignment-answer-config')) return { getFixedAssignmentConfig: () => null };
    if (name.endsWith('/assignment-feedback')) return { assignmentFeedbackModeFromRecord: () => 'always', assignmentFeedbackLabel: () => 'Available' };
    return new Proxy({}, { get: () => props => React.createElement('div', null, props.children) });
  };
  new Function('require', 'exports', compiled)(mockRequire, exports);
  return exports[exportedName];
}
const directory = loadPage('src/components/student-assignments-page.tsx', 'StudentAssignmentsPage');
await assert.rejects(directory({ searchParams: Promise.resolve({ curriculum: 'igcse' }) }), /redirect:\/igcse\/assignments/);
const detail = loadPage('src/components/student-assignment-page.tsx', 'StudentAssignmentPage');
const props = { params: Promise.resolve({ id: 'test-assignment' }), searchParams: Promise.resolve({ success: 'Assignment submitted.' }) };
await assert.rejects(detail(props), /redirect:\/igcse\/assignments\/test-assignment\?success=Assignment\+submitted\./);
const igcseMarkup = renderToStaticMarkup(await detail({ ...props, igcseRoute: true }));
assert.deepEqual(signInArgs, ['/igcse/assignments/test-assignment', 'igcse']);
assert.match(igcseMarkup, /href="\/igcse\/assignments"/);
recordBank = 'ib';
await assert.rejects(detail({ ...props, igcseRoute: true }), /not-found/);
const ibMarkup = renderToStaticMarkup(await detail(props));
assert.match(ibMarkup, /href="\/assignments"/);
assert.deepEqual(signInArgs, ['/assignments/test-assignment', 'ib']);
console.log('PASS: old IGCSE links redirect with messages preserved; IGCSE sign-in/return routes stay scoped; IB assignments cannot render inside the IGCSE shell.');

// Basic student access must not require administrator credentials. Only a confirmed
// approved-school teacher request may enter the existing role-repair path.
const partnerExports = {};
const schoolExports = {};
new Function('exports', ts.transpileModule(readFileSync('src/lib/approved-schools.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(schoolExports);
new Function('require', 'exports', ts.transpileModule(readFileSync('src/lib/partner-school-teacher.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(name => name.endsWith('/approved-schools') ? schoolExports : {}, partnerExports);
for (const fixture of [
  { email: 'student@example.com', account_type: 'student', status: 'none', requested: null, repairs: 0 },
  { email: 'student@jess.sch.ae', account_type: 'student', status: 'none', requested: null, repairs: 0 },
  { email: 'teacher@example.com', account_type: 'teacher', status: 'pending', requested: '2026-10-01', repairs: 0 },
  { email: 'teacher@jess.sch.ae', account_type: 'teacher', status: 'none', requested: null, repairs: 1 },
  { email: 'teacher@jess.sch.ae', account_type: 'student', status: 'pending', requested: '2026-10-01', repairs: 1 },
]) {
  let repairs = 0;
  const user = { id: 'test-user', email: fixture.email, email_confirmed_at: '2026-10-01', user_metadata: { account_type: fixture.account_type } };
  const profile = { role: 'student', teacher_status: fixture.status, teacher_requested_at: fixture.requested };
  const chain = new Proxy({}, { get: (_, name) => name === 'then' ? resolve => resolve({ data: profile }) : () => chain });
  const exports = {};
  const fakeRequire = name => name.endsWith('/partner-school-teacher')
    ? { isAutomaticPartnerSchoolTeacher: partnerExports.isAutomaticPartnerSchoolTeacher, ensurePartnerSchoolTeacherRole: async () => { repairs++; return false; } }
    : name.endsWith('/supabase/server')
      ? { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => chain }) }
      : {};
  new Function('require', 'exports', ts.transpileModule(readFileSync('src/lib/account-access.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(fakeRequire, exports);
  const session = await exports.requireSignedIn('/igcse/assignments/test', 'igcse');
  assert.equal(session.user.id, 'test-user');
  assert.equal(repairs, fixture.repairs, `teacher repair eligibility: ${fixture.email}/${fixture.account_type}/${fixture.status}`);
}
console.log('PASS: ordinary students need no admin role-repair access; confirmed approved-school teacher metadata and pending requests still reconcile.');
