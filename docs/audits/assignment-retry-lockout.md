# Assignment retry lockout — 9 November 2026

The shared assignment UI treated an assignment progress `completed` flag as stronger than the saved answer state. The single-answer save routine marks this progress flag true after a first wrong answer. A subsequent account-state refresh/reopen therefore disabled the choices and released after-question feedback, while the saved answer correctly continued to say one attempt remained.

A read-only production investigation of the reported IGCSE homework confirmed one affected response: assignment question 15 (`4MA1_2019J_1H_Q15`) had `attempt_count=1`, `is_correct=false`, and progress `completed=true`. The assignment was still open. No student data was changed.

## Correction

Automatically checked single and multipart questions now determine completion from their answer results, not the legacy progress flag. Existing paper/whiteboard completion behavior remains unchanged. A retry acknowledgement sets the local attempt count to one; a final incorrect result sets it to two, preventing duplicate replies or a state-before-result update from consuming another attempt locally. Both bank shells request the updated response script.

This is a client correction shared by IB and IGCSE. It requires no data reset or database migration. The student can use the remaining saved attempt after publication, provided the assignment remains open.

## Regression coverage

`node scripts/test-assignment-retries.mjs` fails against the original code and passes with the correction. It covers both account/answer state arrival orders, changing the selected option, duplicate retry acknowledgements, second incorrect/correct locks, all feedback modes, multipart incompletion, numeric/exact inputs, paper completion and submitted read-only work. The check is included in `verify:release`.

Publication is withheld pending Rob’s approval.
