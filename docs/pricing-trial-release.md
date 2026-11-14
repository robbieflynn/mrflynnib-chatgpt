# Pricing and trial release

Prepared from GitHub main `9ebcc82b273ee034c66224203b33f329ee045147`. Preview only. Existing public bank and assignment access is unchanged.

## Plans

| Product | One year (365 days) | Two years (730 days) |
| --- | --- | --- |
| One IB course, student or teacher | US$69 | US$79 |
| Teacher Plus, all four IB courses | US$99 | US$150 |

One payment; no automatic renewal. IGCSE retains its US$79/730-day offer. Existing payment IDs and plan IDs are unchanged. Teachers choosing one course keep their role and classroom data. The main Student Plus choice defaults to two years.

## Trial

Seven days from an explicit start, no card or Stripe session. One IB trial per confirmed account across products; Teacher Plus requires approved teacher status. A fixed audit ledger and separate `promotion` entitlement (`external_provider=plus_trial`) prevent restarts and preserve existing access. Expiry is enforced by existing server entitlement checks, without a cron job. Saved work is retained. Buying during a trial grants a separate full paid period from the purchase time, without shortening or modifying the trial or previous grants. An existing active or scheduled IB course entitlement or school seat makes the account ineligible.

## Before release

1. Review `/pricing-review` on the preview deployment (example account, not proof of a live trial). The route returns 404 on Vercel Production.
2. Install `supabase/migrations/20261114_plus_trials.sql` in a separate test database first. Trial UI fails closed if its history cannot be read; activation fails closed if the migration is missing. Do not install on shared production merely to make a preview test pass.
3. Create one-time USD Stripe prices and set `STRIPE_PRICE_IB_AA_HL_ONE_YEAR`, `STRIPE_PRICE_IB_AA_SL_ONE_YEAR`, `STRIPE_PRICE_IB_AI_HL_ONE_YEAR`, `STRIPE_PRICE_IB_AI_SL_ONE_YEAR` (6900 cents each), and `STRIPE_PRICE_TEACHER_PLUS_IB_TWO_YEARS` (15000 cents). Preserve existing two-year student and one-year teacher price variables. Use sandbox values for testing.
4. Verify real sandbox checkout, signed webhook grant, reload, refund and expiry for each new duration; verify a teacher buying one course returns to that course's confirmation page.
5. On isolated test accounts, verify trial start, repeated click, relogin, expiry, post-expiry saved work, paid purchase during trial, teacher approval, cross-course retry refusal and existing paid/school access protection.
6. Obtain Rob's production approval, apply the additive database change and configure the live prices, deploy and repeat the affected customer journeys. Do not enable question-bank restrictions as part of this release.

## Automated verification

- `node scripts/test-pricing-checkout.mjs`: actual checkout and signed webhook handlers with mocked external services; all plan amounts/durations, teacher single-course, trial-to-paid and duplicate-paid protection.
- `PGLITE_MODULE=<path> node scripts/test-plus-trials.mjs`: actual SQL in isolated PGlite; owner-only reads, denied writes, approval, confirmation, exact expiry, retries and paid/school protection.
- `node scripts/test-access-journey.mjs`: existing access/routing regression checks.
- Lint, TypeScript and production build; desktop/mobile review of actual shared pricing components.

These automated checks do not claim a real Stripe payment or production database migration.
