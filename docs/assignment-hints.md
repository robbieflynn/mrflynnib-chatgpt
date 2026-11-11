# Assignment hints

Teachers opt in with **Allow hints** when creating an assignment or saving its feedback settings. New assignments default off. Browser drafts, reuse and shadow tasks preserve this choice.

In IB and IGCSE student assignments, **Get a hint** reveals one existing authored solution step. Further clicks continue in the solution's original order, with part labels and diagrams. These are steps for the whole question, not separately generated hints for a selected subpart. The existing full-feedback policy remains independent. Hint use never marks an answer correct, consumes an attempt, or completes a question.

Usage is stored per assignment, student and question, separately from responses. Already revealed content is retained as a snapshot and remains readable after submission or disabling hints. New reveals stop after submission. Teacher class review shows each student's total; the student review lists counts and last request time for every question. Counts include successful reveal requests, including a request whose response was lost; retrying that request returns the same step.

## Database prerequisite and rollout

Rob approved the shared-database update on 10 November 2026. `supabase/migrations/20261110_assignment_hints.sql` was applied successfully to the Ireland project. Post-migration verification confirmed zero enabled assignments, zero hint rows, row-level security enabled, browser execution denied and server execution allowed. Authenticated preview testing remains pending sign-in. It adds an opt-in column, a protected usage table, and a server-only transactional writer. It leaves existing assignments hints-off and does not alter existing answers, progress or whiteboards. Preview and production currently share the Ireland database, so applying this is a live database change even while the website feature remains in preview. Do not merge before Rob approves publication.

The hint API also needs the existing `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`. The browser cannot write hint usage directly or choose another student's identity. The function verifies membership, targeted recipients, question assignment and student role again inside the transaction. A locked submission row serializes submission against hint requests. The expected count makes duplicate clicks and network retries idempotent.

The API returns only revealed steps, plus availability/count metadata. Complete solutions remain publicly accessible in the existing public question bank, so this is guided practice rather than a secure examination system.

## Verification

- `node scripts/test-assignment-hints.mjs`: parse all 8,713 solution files; exercise browser progression, lost-response retry, restoration and isolation.
- `node scripts/test-assignment-hints-api.mjs`: API auth/access, same-origin writes, hidden steps, disabled/submitted assignments and errors.
- `HINT_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-assignment-hints-db.mjs`: isolated PostgreSQL migration, permissions, idempotency and submission tests. PGlite is a temporary test dependency, not a product dependency.
- `npm run lint`, `npm run build`, question-bank delivery audit, normal and delayed assignment whiteboard tests.

Before release, test an authenticated disposable assignment in the shared preview: switch hints on, reveal two steps as its student, refresh, confirm counts in both teacher views, disable hints, submit and reopen. The local browser fixture uses sample data and is not evidence of this authenticated round trip.
