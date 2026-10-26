begin;

-- This live question was published before fraction coefficients were
-- canonicalised as (1/2)*.... The assignment page now displays the canonical
-- option, but the stored answer key in those older assignments still expected
-- 1/2.... Keep both representations valid and replace the malformed 1/0
-- distractor that existed in the old snapshot.
update public.assignment_questions
set response_type = 'multipart',
    response_options = '[
      {"label":"a","mode":"multiple_choice","options":["(1/2)*r^2sintheta","(-1/2)*r^2sintheta","(3/2)*r^2sintheta","(1/5)*r^2sintheta","(1/4)*r^2sintheta"]},
      {"label":"b","mode":"multiple_choice","options":["(3/2)*r^2tantheta","(1/5)*r^2tantheta","(1/4)*r^2tantheta","(1/2)*r^2tantheta","(-1/2)*r^2tantheta"]},
      {"label":"c","mode":"whiteboard","options":[]}
    ]'::jsonb
where question_id = 'M11TZ2HL_P1_Q7';

update public.assignment_answer_keys
set accepted_answers = '{
      "a":{"mode":"multiple_choice","answers":["(1/2)*r^2sintheta","1/2r^2sintheta"]},
      "b":{"mode":"multiple_choice","answers":["(1/2)*r^2tantheta","1/2r^2tantheta","POT=(1/2)*r(rtantheta)=(1/2)*r^2tantheta"]},
      "c":{"mode":"whiteboard","answers":[]}
    }'::jsonb,
    numeric_answer = null,
    numeric_tolerance = null,
    correct_option = null,
    updated_at = now()
where question_id = 'M11TZ2HL_P1_Q7';

-- Correct only answers which are mathematically the verified mark-scheme
-- answer and which the stale key marked wrongly. Preserve attempts, other
-- parts, whiteboards and every genuinely incorrect answer.
update public.assignment_responses ar
set response = jsonb_set(
      coalesce(ar.response, '{}'::jsonb),
      '{_partStates,a}',
      coalesce(ar.response #> '{_partStates,a}', '{}'::jsonb)
        || jsonb_build_object(
          'attemptCount', greatest(1, coalesce((ar.response #>> '{_partStates,a,attemptCount}')::integer, 0)),
          'isCorrect', true,
          'result', 'correct'
        ),
      true
    ),
    is_correct = null,
    checked_at = null,
    updated_at = now()
where ar.question_id = 'M11TZ2HL_P1_Q7'
  and replace(lower(coalesce(ar.response #>> '{parts,a}', '')), ' ', '')
      in ('(1/2)*r^2sintheta', '1/2r^2sintheta')
  and coalesce(ar.response #>> '{_partStates,a,result}', '') <> 'correct'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

update public.assignment_responses ar
set response = jsonb_set(
      coalesce(ar.response, '{}'::jsonb),
      '{_partStates,b}',
      coalesce(ar.response #> '{_partStates,b}', '{}'::jsonb)
        || jsonb_build_object(
          'attemptCount', greatest(1, coalesce((ar.response #>> '{_partStates,b,attemptCount}')::integer, 0)),
          'isCorrect', true,
          'result', 'correct'
        ),
      true
    ),
    is_correct = null,
    checked_at = null,
    updated_at = now()
where ar.question_id = 'M11TZ2HL_P1_Q7'
  and replace(lower(coalesce(ar.response #>> '{parts,b}', '')), ' ', '')
      in ('(1/2)*r^2tantheta', '1/2r^2tantheta', 'pot=(1/2)*r(rtantheta)=(1/2)*r^2tantheta')
  and coalesce(ar.response #>> '{_partStates,b,result}', '') <> 'correct'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

-- Reconcile question completion after the corrected part states. Part (c) is
-- teacher-reviewed, so a fully completed question keeps is_correct as null.
update public.assignment_responses ar
set checked_at = case
      when (ar.response #>> '{_partStates,a,result}') in ('correct','incorrect_final','saved')
       and (ar.response #>> '{_partStates,b,result}') in ('correct','incorrect_final','saved')
       and (ar.response #>> '{_partStates,c,result}') in ('correct','incorrect_final','saved')
      then coalesce(ar.checked_at, now())
      else null
    end,
    updated_at = now()
where ar.question_id = 'M11TZ2HL_P1_Q7'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

update public.assignment_question_progress progress
set completed = coalesce((
      (ar.response #>> '{_partStates,a,result}') in ('correct','incorrect_final','saved')
      and (ar.response #>> '{_partStates,b,result}') in ('correct','incorrect_final','saved')
      and (ar.response #>> '{_partStates,c,result}') in ('correct','incorrect_final','saved')
    ), false),
    completed_at = case
      when coalesce(
       (ar.response #>> '{_partStates,a,result}') in ('correct','incorrect_final','saved')
       and (ar.response #>> '{_partStates,b,result}') in ('correct','incorrect_final','saved')
       and (ar.response #>> '{_partStates,c,result}') in ('correct','incorrect_final','saved'),
       false
      )
      then coalesce(progress.completed_at, now())
      else null
    end,
    updated_at = now()
from public.assignment_responses ar
where progress.assignment_id = ar.assignment_id
  and progress.student_id = ar.student_id
  and progress.question_id = ar.question_id
  and ar.question_id = 'M11TZ2HL_P1_Q7'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

update public.assignment_response_requests request
set is_correct = true,
    result = 'correct'
from public.assignment_responses ar
where request.assignment_id = ar.assignment_id
  and request.student_id = ar.student_id
  and request.question_id = ar.question_id
  and request.question_id = 'M11TZ2HL_P1_Q7'
  and (
    (request.part_key = 'a' and replace(lower(coalesce(ar.response #>> '{parts,a}', '')), ' ', '')
      in ('(1/2)*r^2sintheta', '1/2r^2sintheta'))
    or
    (request.part_key = 'b' and replace(lower(coalesce(ar.response #>> '{parts,b}', '')), ' ', '')
      in ('(1/2)*r^2tantheta', '1/2r^2tantheta', 'pot=(1/2)*r(rtantheta)=(1/2)*r^2tantheta'))
  )
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

commit;
