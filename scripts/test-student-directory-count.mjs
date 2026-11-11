import assert from 'node:assert/strict';
import { loadStudentAccounts } from '../src/lib/student-accounts.ts';

for (const size of [0, 1, 499, 500, 1000, 1501]) {
  for (const cap of [100, 500, 1000]) {
    const rows = Array.from({ length: size }, (_, i) => ({ user_id: String(i), email: `student${i}@example.test` }));
    const calls = [];
    const result = await loadStudentAccounts(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, Math.min(to + 1, from + cap)), count: size, error: null };
    });
    assert.equal(result.error, false);
    assert.equal(result.total, size);
    assert.deepEqual(result.accounts, rows);
    assert.equal(calls.length, Math.max(1, Math.ceil(size / Math.min(500, cap))));
  }
}
for (const failure of ['error', 'throw', 'empty', 'duplicate', 'changed-count', 'missing-count']) {
  const result = await loadStudentAccounts(async (from) => {
    if (!from) return { data: [{ user_id: 'first' }], count: 2, error: null };
    if (failure === 'throw') throw new Error('Connection interrupted');
    return {
      data: failure === 'empty' ? [] : [{ user_id: failure === 'duplicate' ? 'first' : 'second' }],
      count: failure === 'missing-count' ? null : failure === 'changed-count' ? 3 : 2,
      error: failure === 'error' ? { message: 'Unavailable' } : null,
    };
  });
  assert.equal(result.error, true, failure);
  assert.equal(result.total, null, failure);
  assert.deepEqual(result.accounts, [], failure);
}
console.log('Student directory: full totals beyond 1,000, smaller API caps, exact boundaries and partial-failure handling passed.');
