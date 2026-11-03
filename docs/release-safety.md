# Mr Flynn IB release safety

Use this gate before every update. Apply the checks in proportion to what the update can affect, but do not treat a successful build or initial page load as proof that a repeated, delayed or progressive interaction still works.

## Automated gate

Run:

```bash
npm run verify:release
```

This must finish successfully. It checks code quality, audits every fixed assignment-answer set, proves the optimized question-bank delivery preserves the canonical question IDs and ordering, and creates a complete production build.

## Branch and data safety

- Start from the current live `main` branch and merge any newer live fixes before final verification.
- Keep one customer-facing change per pull request wherever practical.
- Never replace a complete stored assignment answer object when repairing one part. Update only the affected part and preserve student responses, progress and whiteboards.
- For question-bank delivery changes, prove that the canonical question IDs, order and retained assignment records are unchanged.

## Critical browser checks

Run the journeys affected by the change in a preview or local production build. A question-bank or assignment change is not ready until all of these pass:

1. Open a current student assignment and confirm the first question and its answer controls appear without refreshing.
2. Move to a later question using its number, the right arrow, and a multipart tab. Move back again.
3. Save part (a), then answer part (b), and confirm progress updates without losing either response.
4. Open the whiteboard, draw, switch tools, insert a diagram when available, and change questions without the board or navigator disappearing.
5. Open IB and IGCSE independently. Confirm IB still has Paper 1 and Paper 2 filters while IGCSE does not expose paper labels.
6. Search, filter, switch every available course, reveal a mark scheme and a worked solution, and star a question.
7. Check the relevant teacher flow: open a class, create an assignment, select questions, publish, and reopen the task.

For any question-bank delivery, embedding, filtering or progressive-rendering change, also perform a long-scroll regression in both IB and IGCSE. Load at least 200 questions in each bank, confirm that every successive batch becomes visible, and verify that the distance between the final rendered card and the embedded frame does not grow into a blank area. Repeat this same long-scroll check on the public site after deployment.

Checkout, account-role, email or video changes require their own complete end-to-end test as well as the checks above that overlap with their code.

## Publication rule

- Routine isolated repairs may publish after the gate and relevant browser checks pass.
- Structural changes such as splitting the question-bank data stay in preview until the complete critical journey has been checked.
- After publishing, repeat the affected journey on the public production site and confirm the deployed commit.
