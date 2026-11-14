import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real hook against a database double exposing both the teacher's
// and assigned student's rows, as teacher RLS legitimately does in production.
const compiled = ts.transpileModule(readFileSync('src/lib/use-question-bank-account.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function scenario({ bank = 'ib', assignmentId, viewedStudentId, submitted = false, own = true, snapshot = false, pending = false, userId = 'teacher' } = {}) {
  const sent = [], listeners = new Map(), storage = new Map(), writes = [];
  const working = (owner) => ({ owner, parts: { a: { actions: [{ type: 'stroke', points: [[1, 2]] }] } } });
  const rows = {
    whiteboard_documents: [
      ...(own ? [{ user_id: 'teacher', bank, question_id: 'q', document: working('teacher') }] : []),
      { user_id: 'student', bank, question_id: 'q', document: working('student') },
      { user_id: 'other', bank, question_id: 'q', document: working('other') },
      { user_id: 'teacher', bank: bank === 'ib' ? 'igcse' : 'ib', question_id: 'q', document: working('wrong-bank') },
    ],
    question_progress: ['teacher', 'student'].map(user_id => ({ user_id, bank, question_id: `${user_id}-done`, completed: true })),
    assignment_question_progress: ['teacher', 'student'].map(student_id => ({ student_id, assignment_id: assignmentId, question_id: `${student_id}-done`, completed: true })),
    assignment_whiteboard_snapshots: snapshot ? [{ assignment_id: assignmentId, student_id: viewedStudentId || userId, question_id: 'q', document: working('snapshot') }] : [],
  };
  if (pending) storage.set('mrflynnib:pending-whiteboards:v1', JSON.stringify({
    [`${userId}:${bank}:q`]: { userId, bank, questionId: 'q', document: working('pending'), revision: 'r', attempts: 0, notified: true },
  }));
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: userId } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from(table) {
      const filters = [];
      const result = () => ({ data: (rows[table] || []).filter(row => filters.every(([key, value]) => row[key] === value)), error: null });
      const query = {
        select: () => query, eq: (key, value) => { filters.push([key, value]); return query; },
        range: async () => result(), order: () => query,
        then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
        maybeSingle: async () => { const r = result(); return r.data.length > 1 ? { data: null, error: { code: 'PGRST116' } } : { data: r.data[0] || null, error: null }; },
        upsert: data => { writes.push({ table, data }); return query; }, abortSignal: async () => ({ error: null }),
      };
      return query;
    },
  };
  const frame = { contentWindow: { postMessage: data => sent.push(data) }, addEventListener() {}, removeEventListener() {} };
  let cleanup;
  const fakeRequire = name => {
    if (name === 'react') return { useRef: current => ({ current }), useEffect: fn => { cleanup = fn(); } };
    if (name === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    if (name === '@/lib/supabase/client') return { createClient: () => client };
    if (name === '@/lib/supabase/config') return { hasSupabaseBrowserConfig: () => true };
    throw new Error(name);
  };
  const exports = {};
  const context = vm.createContext({ exports, require: fakeRequire, AbortController, navigator: { onLine: false },
    CustomEvent: class {}, window: {
      location: { origin: 'https://test.invalid' },
      localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
      addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener() {}, dispatchEvent() {},
      setTimeout: () => 1, clearTimeout() {},
    },
  });
  vm.runInContext(compiled, context);
  exports.useQuestionBankAccount({ current: frame }, bank, assignmentId, { viewedStudentId, assignmentSubmitted: submitted });
  for (let i = 0; i < 20; i++) await Promise.resolve();
  const account = sent.findLast(message => message.type === 'mrflynnib-account-state');
  assert.deepEqual(Array.from(account.completedQuestionIds), [`${viewedStudentId || userId}-done`]);
  await listeners.get('message')({ origin: 'https://test.invalid', source: frame.contentWindow, data: { type: 'mrflynnib-whiteboard-load', questionId: 'q' } });
  const loaded = sent.findLast(message => message.type === 'mrflynnib-whiteboard-data');
  assert.equal(loaded.ok, true);
  assert.equal(writes.length, 0, 'loading must never write or copy another account document');
  cleanup();
  return loaded.document?.owner ?? null;
}

for (const bank of ['ib', 'igcse']) {
  assert.equal(await scenario({ bank }), 'teacher');
  assert.equal(await scenario({ bank, own: false }), null, 'a blank teacher board must remain blank despite visible student work');
  assert.equal(await scenario({ bank, userId: 'student' }), 'student');
  assert.equal(await scenario({ bank, pending: true }), 'pending', 'personal unsynced work remains recoverable');
  assert.equal(await scenario({ bank, assignmentId: 'assignment', viewedStudentId: 'student', pending: true }), 'student');
  assert.equal(await scenario({ bank, assignmentId: 'assignment', viewedStudentId: 'student', pending: true, snapshot: true }), 'snapshot');
  assert.equal(await scenario({ bank, assignmentId: 'assignment', userId: 'student', submitted: true, pending: true, snapshot: true }), 'snapshot');
}
console.log('PASS: personal ownership, blank boards, student work, pending drafts, teacher review, submitted snapshots and completion isolation in IB and IGCSE.');
