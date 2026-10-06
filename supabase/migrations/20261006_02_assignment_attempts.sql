alter table public.assignment_responses
  add column if not exists attempt_count integer not null default 0
  check (attempt_count between 0 and 2);

insert into public.assignment_question_progress (
  assignment_id, student_id, question_id, completed, completed_at, updated_at
)
select assignment_id, student_id, question_id, true, updated_at, updated_at
from public.assignment_responses
on conflict (assignment_id, student_id, question_id) do update set
  completed = true,
  completed_at = coalesce(public.assignment_question_progress.completed_at, excluded.completed_at),
  updated_at = greatest(public.assignment_question_progress.updated_at, excluded.updated_at);

create or replace function public.submit_assignment_response(
  assignment_uuid uuid,
  question_key text,
  response_payload jsonb
)
returns table (is_correct boolean, result text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  response_kind text;
  answer_options jsonb;
  accepted jsonb;
  expected_number numeric;
  allowed_tolerance numeric;
  expected_option integer;
  submitted_text text;
  submitted_number numeric;
  submitted_option integer;
  grade_result boolean;
  result_label text;
  existing_attempts integer := 0;
  attempts_after integer := 0;
  has_part_answers boolean := false;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Student answers can only be submitted from a student account.'; end if;
  if not public.can_access_assignment(assignment_uuid, auth.uid()) then raise exception 'Assignment not found.'; end if;
  if response_payload is null or length(response_payload::text) > 4000 then raise exception 'Answer is too long.'; end if;

  select aq.response_type, aq.response_options,
         ak.accepted_answers, ak.numeric_answer, ak.numeric_tolerance, ak.correct_option
    into response_kind, answer_options, accepted, expected_number, allowed_tolerance, expected_option
  from public.assignment_questions aq
  left join public.assignment_answer_keys ak
    on ak.assignment_id = aq.assignment_id and ak.question_id = aq.question_id
  where aq.assignment_id = assignment_uuid and aq.question_id = left(question_key, 160);

  if response_kind is null then raise exception 'Question not found.'; end if;
  select coalesce(ar.attempt_count, 0) into existing_attempts
  from public.assignment_responses ar
  where ar.assignment_id = assignment_uuid and ar.student_id = auth.uid() and ar.question_id = left(question_key, 160);
  existing_attempts := coalesce(existing_attempts, 0);
  if response_kind <> 'teacher_review' and existing_attempts >= 2 then
    return query select false, 'locked'::text;
    return;
  end if;

  submitted_text := left(trim(coalesce(response_payload ->> 'text', '')), 500);
  has_part_answers := jsonb_typeof(response_payload -> 'parts') = 'object'
    and jsonb_object_length(response_payload -> 'parts') > 0;

  if response_kind = 'multiple_choice' then
    if not (response_payload ? 'option') then raise exception 'Choose an answer.'; end if;
    submitted_option := (response_payload ->> 'option')::integer;
    if submitted_option is null or submitted_option < 0 or submitted_option >= jsonb_array_length(answer_options) then raise exception 'Choose a valid answer.'; end if;
    grade_result := case when expected_option is null then null else submitted_option = expected_option end;
  elsif response_kind = 'numeric' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    begin
      submitted_number := replace(replace(submitted_text, ',', ''), ' ', '')::numeric;
    exception when invalid_text_representation then
      submitted_number := null;
    end;
    grade_result := case when expected_number is null then null when submitted_number is null then false else abs(submitted_number - expected_number) <= coalesce(allowed_tolerance, 0) end;
  elsif response_kind = 'exact' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    if accepted is null or jsonb_array_length(accepted) = 0 then grade_result := null;
    else select exists (select 1 from jsonb_array_elements_text(accepted) item where lower(regexp_replace(trim(item), '\s+', '', 'g')) = lower(regexp_replace(submitted_text, '\s+', '', 'g'))) into grade_result; end if;
  else
    if submitted_text = '' and not has_part_answers then raise exception 'Enter an answer.'; end if;
    grade_result := null;
  end if;

  attempts_after := case when response_kind = 'teacher_review' then existing_attempts else least(existing_attempts + 1, 2) end;
  insert into public.assignment_responses (assignment_id, student_id, question_id, response, is_correct, attempt_count, checked_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), response_payload, grade_result, attempts_after, case when grade_result is null then null else now() end, now())
  on conflict (assignment_id, student_id, question_id) do update set response = excluded.response, is_correct = excluded.is_correct, attempt_count = excluded.attempt_count, checked_at = excluded.checked_at, updated_at = now();

  insert into public.assignment_question_progress (assignment_id, student_id, question_id, completed, completed_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), true, now(), now())
  on conflict (assignment_id, student_id, question_id) do update set completed = true, completed_at = coalesce(public.assignment_question_progress.completed_at, now()), updated_at = now();

  insert into public.assignment_submissions (assignment_id, student_id, status, submitted_at, updated_at)
  values (assignment_uuid, auth.uid(), 'in_progress', null, now())
  on conflict (assignment_id, student_id) do update set status = 'in_progress', submitted_at = null, updated_at = now();

  result_label := case when grade_result is true then 'correct' when grade_result is false and attempts_after < 2 then 'retry' when grade_result is false then 'incorrect_final' else 'saved' end;
  return query select grade_result, result_label;
end;
$$;

grant execute on function public.submit_assignment_response(uuid, text, jsonb) to authenticated;
