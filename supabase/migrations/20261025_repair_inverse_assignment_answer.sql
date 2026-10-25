begin;

-- The earlier extractor selected the penultimate algebra line for part (a)
-- instead of the final awarded inverse-function answer. Repair every published
-- copy while leaving part (b), whiteboards and unrelated student work intact.
update public.assignment_questions
set response_type = 'multipart',
    response_options = '[
      {"label":"a","mode":"multiple_choice","options":["f^-1(x)=((x-2))/((x-3))","f^-1(x)=(-(x-3))/((x-2))","f^-1(x)=((x-3))/((x-2)+1)","f^-1(x)=(x-3)/(x-2)","f^-1(x)=((x-3)+1)/((x-2))"]},
      {"label":"b","mode":"multiple_choice","options":["x = 8/3","x = 5/3","x = 11/3","x = 3/8","x = -8/3"]}
    ]'::jsonb
where question_id = 'M10TZ2HL_P1_Q10';

update public.assignment_answer_keys
set accepted_answers = '{
      "a":{"mode":"multiple_choice","answers":["f^-1(x)=(x-3)/(x-2)","(x-3)/(x-2)"]},
      "b":{"mode":"multiple_choice","answers":["x = 8/3"]}
    }'::jsonb,
    numeric_answer = null,
    numeric_tolerance = null,
    correct_option = null,
    updated_at = now()
where question_id = 'M10TZ2HL_P1_Q10';

-- Students who already saw the broken choices need a clean attempt at part
-- (a). Preserve every other part and do not alter submitted assignments.
update public.assignment_responses ar
set response = jsonb_set(
      jsonb_set(
        coalesce(ar.response, '{}'::jsonb),
        '{parts}',
        case when jsonb_typeof(ar.response -> 'parts') = 'object'
          then (ar.response -> 'parts') - 'a'
          else '{}'::jsonb
        end,
        true
      ),
      '{_partStates}',
      case when jsonb_typeof(ar.response -> '_partStates') = 'object'
        then (ar.response -> '_partStates') - 'a'
        else '{}'::jsonb
      end,
      true
    ),
    is_correct = null,
    checked_at = null,
    updated_at = now()
where ar.question_id = 'M10TZ2HL_P1_Q10'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = ar.assignment_id
      and submitted.student_id = ar.student_id
      and submitted.status = 'submitted'
  );

update public.assignment_question_progress progress
set completed = false,
    completed_at = null,
    updated_at = now()
where progress.question_id = 'M10TZ2HL_P1_Q10'
  and not exists (
    select 1
    from public.assignment_submissions submitted
    where submitted.assignment_id = progress.assignment_id
      and submitted.student_id = progress.student_id
      and submitted.status = 'submitted'
  );

commit;
