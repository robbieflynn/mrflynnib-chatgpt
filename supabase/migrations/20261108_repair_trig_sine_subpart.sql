begin;

-- Repair the sine subpart only. The shared source mark scheme ends with
-- sin(2 phi), which was incorrectly used for both (a)(i) and (a)(ii).
-- Preserve every other part, student response, attempt and whiteboard.
update public.assignment_answer_keys
set accepted_answers = jsonb_set(
      accepted_answers,
      array['a(i)'],
      '{"mode":"multiple_choice","answers":["sqrt(7)/4"]}'::jsonb,
      true
    ),
    updated_at = now()
where question_id = 'A_M23TZ2SL_P1_Q8'
  and jsonb_typeof(accepted_answers) = 'object';

update public.assignment_questions q
set response_options = (
  select jsonb_agg(
    case when part ->> 'label' = 'a(i)'
      then jsonb_set(part, '{options}', '["sqrt(7)/4","3*sqrt(7)/8","sqrt(7)/8","-sqrt(7)/4","7/16"]'::jsonb)
      else part
    end order by position
  )
  from jsonb_array_elements(q.response_options) with ordinality as parts(part, position)
)
where question_id = 'A_M23TZ2SL_P1_Q8'
  and response_type = 'multipart'
  and jsonb_typeof(response_options) = 'array';

commit;
