create or replace function public.submit_assignment_part_response(
  assignment_uuid uuid,
  question_key text,
  part_key text,
  part_answer text
)
returns table (is_correct boolean, result text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted jsonb;
  part_config jsonb;
  existing_response jsonb := '{}'::jsonb;
  saved_parts jsonb := '{}'::jsonb;
  part_states jsonb := '{}'::jsonb;
  saved_part_state jsonb := '{}'::jsonb;
  answer_value text;
  part_matches boolean;
  part_attempts integer := 0;
  part_result text;
  checked_part_key text;
  checked_part_config jsonb;
  checked_result text;
  all_parts_complete boolean := true;
  has_review_parts boolean := false;
  has_incorrect_parts boolean := false;
  overall_result boolean;
  overall_attempts integer := 0;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Student answers can only be submitted from a student account.'; end if;
  if not public.can_access_assignment(assignment_uuid, auth.uid()) then raise exception 'Assignment not found.'; end if;
  part_key := left(trim(coalesce(part_key, '')), 30);
  answer_value := left(trim(coalesce(part_answer, '')), 500);
  if part_key = '' then raise exception 'Choose a question part.'; end if;

  select ak.accepted_answers into accepted
  from public.assignment_questions aq
  join public.assignment_answer_keys ak on ak.assignment_id = aq.assignment_id and ak.question_id = aq.question_id
  where aq.assignment_id = assignment_uuid
    and aq.question_id = left(question_key, 160)
    and aq.response_type = 'multipart';
  if accepted is null or jsonb_typeof(accepted) <> 'object' or not (accepted ? part_key) then raise exception 'That question part was not found.'; end if;

  select coalesce(ar.response, '{}'::jsonb) into existing_response
  from public.assignment_responses ar
  where ar.assignment_id = assignment_uuid and ar.student_id = auth.uid() and ar.question_id = left(question_key, 160);
  existing_response := coalesce(existing_response, '{}'::jsonb);
  saved_parts := case when jsonb_typeof(existing_response -> 'parts') = 'object' then existing_response -> 'parts' else '{}'::jsonb end;
  part_states := case when jsonb_typeof(existing_response -> '_partStates') = 'object' then existing_response -> '_partStates' else '{}'::jsonb end;
  saved_part_state := coalesce(part_states -> part_key, '{}'::jsonb);
  if saved_part_state ->> 'result' in ('correct', 'incorrect_final', 'saved') then
    return query select case when saved_part_state ->> 'result' = 'correct' then true when saved_part_state ->> 'result' = 'incorrect_final' then false else null end, 'locked'::text;
    return;
  end if;

  part_config := accepted -> part_key;
  if part_config ->> 'mode' = 'whiteboard' then
    if answer_value <> '__whiteboard__' then raise exception 'Confirm that this part is on the whiteboard or paper.'; end if;
    part_matches := null;
    part_result := 'saved';
  else
    if answer_value = '' then raise exception 'Choose or enter an answer for this part.'; end if;
    select exists (
      select 1 from jsonb_array_elements_text(part_config -> 'answers') item
      where lower(regexp_replace(trim(item), '\s+', '', 'g')) = lower(regexp_replace(answer_value, '\s+', '', 'g'))
    ) into part_matches;
    part_attempts := least(coalesce((saved_part_state ->> 'attemptCount')::integer, 0) + 1, 2);
    part_result := case when part_matches then 'correct' when part_attempts < 2 then 'retry' else 'incorrect_final' end;
  end if;

  saved_parts := jsonb_set(saved_parts, array[part_key], to_jsonb(answer_value), true);
  part_states := jsonb_set(part_states, array[part_key], jsonb_build_object(
    'result', part_result,
    'isCorrect', part_matches,
    'attemptCount', part_attempts
  ), true);
  existing_response := existing_response || jsonb_build_object('parts', saved_parts, '_partStates', part_states);

  for checked_part_key, checked_part_config in select key, value from jsonb_each(accepted)
  loop
    checked_result := part_states -> checked_part_key ->> 'result';
    if coalesce(checked_result, '') not in ('correct', 'incorrect_final', 'saved') then all_parts_complete := false; end if;
    if checked_result = 'saved' then has_review_parts := true; end if;
    if checked_result = 'incorrect_final' then has_incorrect_parts := true; end if;
  end loop;
  select coalesce(max(coalesce((value ->> 'attemptCount')::integer, 0)), 0) into overall_attempts from jsonb_each(part_states);
  overall_result := case when not all_parts_complete then null when has_incorrect_parts then false when has_review_parts then null else true end;

  insert into public.assignment_responses (assignment_id, student_id, question_id, response, is_correct, attempt_count, checked_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), existing_response, overall_result, overall_attempts, case when all_parts_complete then now() else null end, now())
  on conflict (assignment_id, student_id, question_id) do update set response = excluded.response, is_correct = excluded.is_correct, attempt_count = excluded.attempt_count, checked_at = excluded.checked_at, updated_at = now();
  insert into public.assignment_question_progress (assignment_id, student_id, question_id, completed, completed_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), all_parts_complete, case when all_parts_complete then now() else null end, now())
  on conflict (assignment_id, student_id, question_id) do update set completed = excluded.completed, completed_at = case when excluded.completed then coalesce(public.assignment_question_progress.completed_at, now()) else null end, updated_at = now();
  insert into public.assignment_submissions (assignment_id, student_id, status, submitted_at, updated_at)
  values (assignment_uuid, auth.uid(), 'in_progress', null, now())
  on conflict (assignment_id, student_id) do update set status = 'in_progress', submitted_at = null, updated_at = now();

  return query select part_matches, part_result;
end;
$$;

grant execute on function public.submit_assignment_part_response(uuid, text, text, text) to authenticated;

-- Correct the already-published configuration for the reported intercept question,
-- but only where no student has saved a response to that question yet.
update public.assignment_questions aq
set response_options = (
  select jsonb_agg(
    case when item.value ->> 'label' = 'a' then jsonb_build_object(
      'label', 'a',
      'mode', 'multiple_choice',
      'options', jsonb_build_array('x=±sqrt(5)', 'x=±sqrt(11)', 'x=±sqrt(7)', 'x=±sqrt(2)', 'x=±sqrt(3)')
    ) else item.value end
    order by item.ordinality
  )
  from jsonb_array_elements(aq.response_options) with ordinality as item(value, ordinality)
)
where aq.question_id = 'M14TZ2SL_P2_Q2'
  and aq.response_type = 'multipart'
  and not exists (
    select 1 from public.assignment_responses ar
    where ar.assignment_id = aq.assignment_id and ar.question_id = aq.question_id
  );

update public.assignment_answer_keys ak
set accepted_answers = jsonb_set(
  ak.accepted_answers,
  '{a}',
  jsonb_build_object('mode', 'multiple_choice', 'answers', jsonb_build_array('x=±sqrt(5)', '±sqrt(5)', 'x=±2.24', '±2.24')),
  true
), updated_at = now()
where ak.question_id = 'M14TZ2SL_P2_Q2'
  and jsonb_typeof(ak.accepted_answers) = 'object'
  and not exists (
    select 1 from public.assignment_responses ar
    where ar.assignment_id = ak.assignment_id and ar.question_id = ak.question_id
  );

notify pgrst, 'reload schema';
