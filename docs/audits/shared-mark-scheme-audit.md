# Shared mark-scheme answer-mapping audit — 8 November 2026

Source revision: `291970b13a7434c20625e741c39367b11168816d` (main). Audit branch: `codex/shared-mark-scheme-audit`.

**Audit only. No answer configuration, application code, database record or deployment changed by this audit.**

## Scope and method

Inspected the active IB and IGCSE canonical seed questions against the checked-in assignment answer catalogue. Used the current generator’s romanSubparts, rowsForSubpart and promptForSubpart behaviour to identify every parent with at least one subpart falling back to its shared mark-scheme rows, then included all siblings. This produced 169 fallback subparts plus six siblings: 175 subparts across 66 questions (137 IB, 38 IGCSE). Of these, 131 have multiple-choice keys and 44 use whiteboards.

Compared the selected answer, subpart prompt, surrounding prompt and shared source rows for every inventory entry. Expected corrections below were recorded from that review, with direct arithmetic/algebra checks where straightforward. This does not independently re-solve every question on the platform, verify every distractor, inspect live rendering, or establish which existing classroom assignments contain these configurations. Diagrams were not visually rechecked; diagram-dependent values are attributed to the supplied mark schemes.

Evidence is retained in `shared-mark-scheme-candidates.json`; the complete per-part decisions are in `shared-mark-scheme-review.json` and `.csv`. The inventory was generated using the unchanged parser functions from `scripts/audit-assignment-choices.mjs`, canonical `question-bank-data/*-seed.json`, active IDs from `src/data/question-bank-progress.json`, and `src/data/assignment-answer-configs.json`.

## Results

| Classification | Subparts |
|---|---:|
| whiteboard | 44 |
| matches_source | 72 |
| wrong_answer | 46 |
| cross_part_content | 2 |
| answer_form | 1 |
| combined_answers | 3 |
| false_subpart | 5 |
| response_mode | 2 |

59 subparts across 39 questions need correction or response-format review. These are not all wrong numerical answers: the classifications distinguish wrong results, combined answers, malformed prompts, response mode and extraneous content. The previously repaired sine answer is included and matches its intended part.

## Root causes

- Missing subpart markers cause the whole parent mark scheme to be reused; extraction can select a later result, test value or explanation.
- Inline markers and headings such as “part (i)” are not reliably split. A labelled first part can also absorb later unlabelled answers.
- References to earlier parts are mistaken for new subparts, producing fragmentary prompts.
- Shared drawing instructions and requested answer forms are not always preserved.

## Required repair and validation

1. Correct the reviewed mappings and malformed subpart boundaries. Do not blindly assign the last shared answer to every part. Keep uncertain mappings as explicitly reviewed whiteboard tasks rather than presenting an unverified automatic key.
2. Add regressions using independently recorded expected answers, including multiple solutions, inline labels, unlabelled sections, references to earlier parts and shared drawing instructions. Comparing the generator to its own output cannot establish correctness.
3. Regenerate the catalogue and review its exact diff. Check both IB and IGCSE and preserve unrelated configurations.
4. Identify existing assignments that copied affected configurations; prepare a targeted repair preserving student answers and whiteboards. Do not silently regrade or claim old assignments are repaired by a catalogue-only change.
5. Run the release checks and authenticated preview checks before asking Rob to approve publication.

## Items needing work

| Bank / question | Part | Classification | Current selected answer | Intended answer / action |
|---|---|---|---|---|
| M14TZ1HL_P2_Q12 | a(i) | wrong_answer | 3 | -1 |
| M14TZ1HL_P2_Q12 | d(i) | wrong_answer | x=0;±2;±4;±6;±8 | x = ±1, ±3 |
| M14TZ1HL_P2_Q12 | d(ii) | wrong_answer | x=0;±2;±4;±6;±8 | x = 0, ±2, ±4 |
| M14TZ1HL_P2_Q12 | e(i) | wrong_answer | 2n(n+1) | N = 2n + 1 |
| M14TZ2HL_P1_Q11 | a(ii) | wrong_answer | 0.75 | 0.016 |
| M14TZ2HL_P1_Q14 | c(i) | wrong_answer | f(1)=(π)/4+(π)/4 | f′(x) = 0 |
| M14TZ2HL_P1_Q14 | d(i) | cross_part_content | Nigel is correct; arctan(x) and 1/x are both odd, and the sum of a composition of odd functions is odd; Hence f(x)=-(π)/2 for x<0 | Nigel is correct, with an odd-function justification. |
| M14TZ2HL_P1_Q14 | d(ii) | wrong_answer | x<0 | -π/2 |
| M14TZ2HL_P2_Q1 | a(i) | answer_form | sum_(n=1)^27(7+7n) | 2835 |
| M14TZ2HL_P2_Q6 | a(i) | wrong_answer | 0.276 | 0.013824 (0.0138 to 3 sf) |
| M14TZ2HL_P2_Q11 | c(i) | wrong_answer | 0.826 | 0.860 |
| M14TZ2HL_P2_Q12 | b(i) | wrong_answer | dC/dx>0 | k(5x/sqrt(202500+x²) - 1) |
| M14TZ2HL_P2_Q12 | b(ii) | wrong_answer | x=92 | x ≈ 91.9 m, with a minimum justification |
| M14TZ2HL_P2_Q12 | e(i) | wrong_answer | x=4.17% | 260 m |
| M14TZ2HL_P2_Q13 | b(i) | wrong_answer | 32 rad | u = 2 cis(π/3); v = sqrt(2) cis(-π/4) |
| A_M25TZ3HL_P2_Q11 | a(i) | wrong_answer | 0.323 | 0.467 |
| A_M25TZ3HL_P2_Q11 | c(i) | wrong_answer | 0.577 | 0.104 |
| A_N21TZ0HL_P2_Q11 | a(i) | wrong_answer | -51 | DE = (-1,-4,-5); DF = (3,-5,-2) |
| H_M16TZ2HL_P1_Q11 | b(i) | wrong_answer | dh/dt = 0.0398 | dh/dt = 2/[π(3 cos(2h)+4)²] |
| H_M14TZ1SL_P1_Q8 | d(i) | wrong_answer | 60° rad | A direction vector proportional to (0,-1,1) |
| A_N23TZ1SL_P2_Q1 | a(i) | wrong_answer | 1 | -1 |
| A_M24TZ1SL_P1_Q7 | a(i) | wrong_answer | 6x - 10 | 3x² - 10x + 3 |
| A_M23TZ1SL_P1_Q8 | a(i) | wrong_answer | 36 | 48 |
| A_M22TZ1SL_P1_Q8 | b(ii) | wrong_answer | n = 10 | k = -2/5 |
| A_N22TZ0SL_P1_Q8 | a(i) | wrong_answer | x = 6 | -3 |
| A_N22TZ0SL_P1_Q8 | a(ii) | wrong_answer | x = 6 | 1/3 |
| A_M23TZ1SL_P2_Q8 | a(i) | wrong_answer | q=120 | p = 16 |
| A_M23TZ2SL_P2_Q9 | a(i) | wrong_answer | P(FF)=30/(n^2-n) | 6/n |
| A_M24TZ1SL_P2_Q9 | a(i) | wrong_answer | 527 m^2 | 73.6° AND 40.4° |
| A_N23TZ1SL_P2_Q9 | c(ii) | wrong_answer | 0.0103 | 0.0143 |
| W_M24TZ1AIHL_P2_Q4 | a(i) | combined_answers | 0.8 (ii) 0.4 (iii) 0.6 | 0.8 |
| W_M24TZ1AIHL_P2_Q4 | a(ii) | combined_answers | 0.8 (ii) 0.4 (iii) 0.6 | 0.4 |
| W_M24TZ1AIHL_P2_Q4 | a(iii) | combined_answers | 0.8 (ii) 0.4 (iii) 0.6 | 0.6 |
| N20TZ0AISL_P2_Q2 | e(i) | false_subpart | 58/100 × 45/100 ≠ 17/100 | Keep the original single reasoning question; do not split its references to earlier parts. |
| N20TZ0AISL_P2_Q2 | e(ii) | false_subpart | they are not independent; 58/100 × 45/100 ≠ 17/100 OR 0.261 ≠ 0.17 | Keep the original single reasoning question; do not split its references to earlier parts. |
| M15TZ2AISL_P1_Q2 | a(i) | wrong_answer | 30° | 80 m placed on TB |
| M15TZ2AISL_P1_Q2 | a(ii) | response_mode | 30° | Mark 30° in the correct position on the diagram. |
| N11TZ0AISL_P2_Q2 | b(i) | false_subpart | Pam is not correct | Keep the original single reasoning question; do not split its references to earlier parts. |
| N11TZ0AISL_P2_Q2 | b(ii) | false_subpart | Pam is not correct | Keep the original single reasoning question; do not split its references to earlier parts. |
| N11TZ0AISL_P2_Q2 | b(iii) | false_subpart | 1/20 ≠ 1/4 × 9/40; Pam is not correct | Keep the original single reasoning question; do not split its references to earlier parts. |
| V_M24TZ1AISL_P2_Q4 | a(i) | wrong_answer | 0.75 | 0.8 |
| V_M24TZ1AISL_P2_Q4 | a(ii) | wrong_answer | 0.75 | 0.25 |
| 4MA1_2019J_2HR_Q5 | b(i) | wrong_answer | 332° | 154 m (source accepts 150–158 m) |
| 4MA1_2019J_2HR_Q14 | a(i) | wrong_answer | b/3 | a² |
| 4MA1_2019J_2HR_Q14 | a(ii) | wrong_answer | b/3 | ab⁴ |
| 4MA1_2019M_1H_Q22 | b(i) | wrong_answer | matrix(3;1) | (x-3)² + 1 |
| 4MA1_2019M_1HR_Q21 | a(i) | wrong_answer | (4,9) | (9,3) |
| 4MA1_2020J_1HR_Q18 | a(i) | wrong_answer | y=-0.6x+3.6 | Gradient approximately -0.6 (source permits -0.4 to -0.7 with suitable working) |
| 4MA1_2021M_2H_Q9 | i | wrong_answer | x=-6 | (x+6)(x-4) |
| 4MA1_2021N_1H_Q9 | i | wrong_answer | -2 | -2 ≤ x < 4 |
| 4MA1_2021N_1H_Q9 | ii | response_mode | -2 | Number line: closed endpoint at -2, open endpoint at 4, interval between them. |
| 4MA1_2021N_1H_Q14 | a(i) | wrong_answer | 2bold(b)-3bold(a) | b-a |
| 4MA1_2021N_1H_Q14 | a(ii) | wrong_answer | 2bold(b)-3bold(a) | 4b-2a |
| 4MA1_2021N_2H_Q8 | b(i) | wrong_answer | x=-4 | (x+4)(x-9) |
| 4MA1_2022J_1H_Q6 | b(i) | wrong_answer | y=7 | (y-7)(y+5) |
| 4MA1_2022J_1H_Q23 | i | wrong_answer | (5,10) | (-4,7) |
| 4MA1_2023J_1HR_Q8 | b(ii) | wrong_answer | (y-6)*(y+3) | y = 6 OR y = -3 |
| 4MA1_2023J_2H_Q14 | a(i) | wrong_answer | 180° | 140° |
| 4MA1_2023J_2H_Q14 | a(ii) | cross_part_content | 140°; Opposite angles of a cyclic quadrilateral add to 180° | Opposite angles of a cyclic quadrilateral add to 180°. |
