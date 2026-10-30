begin;

-- The official mark scheme awards the two unique-triangle cases on separate
-- lines.  The original assignment snapshot retained only k >= 6 and omitted
-- the right-angled boundary case k = 3.  Keep both cases together in every
-- existing assignment that contains this question.
update public.assignment_questions aq
set response_type = 'multipart',
    response_options = (
      select jsonb_agg(
        case when part.value->>'label' = 'b' then
          jsonb_set(
            jsonb_set(part.value, '{mode}', '"multiple_choice"'::jsonb, true),
            '{options}',
            '[
              "latex:k=3\\text{ or }k\\ge 6",
              "k>3",
              "3≤k≤6",
              "k=3; k>6",
              "k≥6"
            ]'::jsonb,
            true
          )
        else part.value end
        order by part.ordinality
      )
      from jsonb_array_elements(coalesce(aq.response_options, '[]'::jsonb))
        with ordinality as part(value, ordinality)
    )
where aq.question_id = 'N12TZ0HL_P1_Q7';

update public.assignment_answer_keys
set accepted_answers = jsonb_set(
      coalesce(accepted_answers, '{}'::jsonb),
      '{b}',
      '{
        "mode":"multiple_choice",
        "answers":[
          "latex:k=3\\text{ or }k\\ge 6",
          "k=3 or k>=6",
          "k=3 or k≥6"
        ]
      }'::jsonb,
      true
    ),
    numeric_answer = null,
    numeric_tolerance = null,
    correct_option = null,
    updated_at = now()
where question_id = 'N12TZ0HL_P1_Q7';

-- Submitted work and student responses are deliberately preserved.  The app
-- now reads the corrected fixed catalogue for marking, while historical work
-- remains an honest record of what the student was shown at the time.

commit;
