# Teachable expiry audit — 12 November 2026

Compared live Ireland Supabase access against the original staged Teachable migration records. This is a comparison with the stored migration snapshot, not a fresh Teachable API export.

- 87 issued `teachable-migration` entitlements (25 Teachable-source and 62 school-source): all matched their original migration records; zero expiry mismatches.
- 185 claimed migration records: the remaining 98 are covered by independent `school-domain` grants (31 IGCSE, 66 individual IB courses and one Teacher Plus). All are approved-school records. The previously approved no-expiry school arrangement remains separate from the historical transfer dates.
- 894 verified records remain staged for exact-email claiming. Their original dates remain unchanged; the claim function excludes expired records.
- No issued `teachable-transfer` manual approvals were found.
- The specifically authorised all-course administrator grant was aligned to the latest original source expiry, 2028-09-16T07:22:02Z. The update was guarded by account, product, provider, original timestamp and grant note; exactly one row changed. Its metadata retains the previous expiry for audit.

No bulk two-year reset was present, so no blanket expiry update was needed. Independent purchases, promotions and school-domain arrangements were preserved.

The account menu now reports effective course status and dates, accounting for overlapping grants and role/curriculum boundaries. Manual Teachable approval no longer silently grants perpetual access: verified import dates take precedence; otherwise an original expiry or explicit no-expiry verification is required.

Validation: course-status behaviour tests, TypeScript, full ESLint (zero errors; three existing warnings). Vercel preview production build is checked separately at release.
