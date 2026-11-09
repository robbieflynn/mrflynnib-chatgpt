# Stored answer formatting audit — 9 November 2026

Status: local corrections; not published. No database changes or student-response changes.

## Scope and evidence

Checked all 58,835 stored choices across 5,231 IB and IGCSE questions using the actual KaTeX renderer embedded in both banks, with parse failures treated as errors. Also checked for leaked formatting commands and malformed text. The baseline at `8a2dc2e0f` contains 377 affected options across 77 parts / 69 questions; see `stored-answer-formatting-baseline.json`. Many share one rendering defect, rather than being separate mathematical errors.

The corrected catalogue passes this formatting scan. This is not independent mathematical verification of every answer, nor a guarantee that every possible visual defect is detected.

## Corrections

Seventeen corrected parts across twelve IB questions have explicit stored corrections in `question-bank-data/reviewed-format-answer-fixes.json`, fingerprinted against their source questions:

- W_M21TZ2AIHL_P1_Q12 a(i), a(ii): complex exponential forms; remove leaked decimal-approximation commands.
- A_M25TZ1HL_P2_Q8 b: exponential sum in modulus–argument form.
- M13TZ1HL_P1_Q13 c(i), c(ii): include both valid r values and repair the binomial probability sum.
- M16TZ2HL_P1_Q5 a, b(ii): binomial expression and expected number of heads (not a probability labelled p).
- M09TZ2SL_P1_Q3 c: binomial coefficient formatting.
- A_N24TZ0HL_P1_Q6 b: remove leaked inequality command text.

Shared typesetting corrections cover bracket processing, nested powers, subscripts, percentages/currency, and mathematical notation embedded in prose. The browser no longer calls the legacy routine that rewrote prepared options. Its exposed choice API contains only rendering and shuffling. Server publication continues to use the committed catalogue; preparation happens offline.

The rebuild also exposed incomplete existing complex answers. Reviewed corrections include M14TZ2HL_P1_Q7 b (full conjugate in exponential form), M19TZ1HL_P2_Q2 a/b (both square roots in each requested form), A_M25TZ3HL_P1_Q8 a (full exponential form), A_M24TZ1HL_P1_Q12 e (all three labelled rotated roots), W_M25TZ3AIHL_P2_Q7 a/c(i) (full branch expressions), and N13TZ0HL_P1_Q8 b (proper range notation). Other candidate changes were held at their previous prepared values, including a whiteboard-to-choice promotion, to avoid unrelated replacements.

## Safeguards and delivery

`test-stored-answer-rendering.mjs` is now part of the release checks. It renders every stored option and verifies reviewed fixes, selected independent calculations, and the absence of browser generation/repair APIs.

The prepared SQL migration targets only exact matching old assignment options and answer keys. It has not been applied; unexpected historical variants require separate review. It never changes responses, attempt counts, progress, submissions or whiteboards.

The browser connection recovered and the reported complex-number question was opened and visually inspected in the local question-bank preview. Its introductory sentence is intact and the two real subparts are correctly separated, including at the narrow browser width. This is a local render, not a production check; the answer-choice gallery has not had a complete visual review. Production publication requires Rob’s approval.

## Validation

Passed: all stored choices through the embedded renderer; whiteboard gestures and normal/delayed assignment whiteboards; bank navigation; formula booklets; existing shared-answer regressions; bank delivery; course practice delivery. Full lint has zero errors and three pre-existing warnings. Production build passes with the repository release workflow's webpack option (the default Turbopack build cannot resolve the shared worktree dependency symlink). Final catalogue rebuild verification is recorded in the PR when complete.

## Question splitting

The shared display fix in both bank renderers distinguishes inline references such as “parts (a)(i) and (a)(ii)” from actual question labels. It also skips references within a real list without abandoning later subparts. Explicit line breaks after a reference still allow genuine following subparts. Across 11,832 source parts, 20 IB layouts change; IGCSE layouts remain unchanged. Tests preserve all source wording and cover inline lists, reference-only sentences, relettered extracts and tables.
