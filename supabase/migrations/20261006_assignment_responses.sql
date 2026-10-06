alter table public.assignment_questions add column if not exists response_type text not null default 'teacher_review';
alter table public.assignment_questions add column if not exists response_options jsonb not null default '[]'::jsonb;
alter table public.assignment_questions drop constraint if exists assignment_questions_response_type_check;
alter table public.assignment_questions add constraint assignment_questions_response_type_check
  check (response_type in ('teacher_review', 'exact', 'numeric', 'multiple_choice'));

create table if not exists public.assignment_answer_keys (
  assignment_id uuid not null,
  question_id text not null,
  accepted_answers jsonb not null default '[]'::jsonb,
  numeric_answer numeric,
  numeric_tolerance numeric check (numeric_tolerance is null or numeric_tolerance >= 0),
  correct_option integer check (correct_option is null or correct_option >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (assignment_id, question_id),
  foreign key (assignment_id, question_id)
    references public.assignment_questions(assignment_id, question_id) on delete cascade
);

create table if not exists public.assignment_responses (
  assignment_id uuid not null,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_id, question_id),
  foreign key (assignment_id, question_id)
    references public.assignment_questions(assignment_id, question_id) on delete cascade
);

alter table public.assignment_answer_keys enable row level security;
alter table public.assignment_responses enable row level security;

drop policy if exists "Teachers manage assignment answer keys" on public.assignment_answer_keys;
create policy "Teachers manage assignment answer keys" on public.assignment_answer_keys
  for all using (public.can_access_assignment(assignment_id) and public.is_teacher())
  with check (public.can_access_assignment(assignment_id) and public.is_teacher());

drop policy if exists "Students read own assignment responses" on public.assignment_responses;
create policy "Students read own assignment responses" on public.assignment_responses
  for select using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));

drop policy if exists "Teachers read assignment responses" on public.assignment_responses;
create policy "Teachers read assignment responses" on public.assignment_responses
  for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

create index if not exists assignment_responses_assignment_idx
  on public.assignment_responses (assignment_id, student_id);

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
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Student answers can only be submitted from a student account.'; end if;
  if not public.can_access_assignment(assignment_uuid, auth.uid()) then raise exception 'Assignment not found.'; end if;
  if response_payload is null or length(response_payload::text) > 2000 then raise exception 'Answer is too long.'; end if;

  select aq.response_type, aq.response_options,
         ak.accepted_answers, ak.numeric_answer, ak.numeric_tolerance, ak.correct_option
    into response_kind, answer_options, accepted, expected_number, allowed_tolerance, expected_option
  from public.assignment_questions aq
  left join public.assignment_answer_keys ak
    on ak.assignment_id = aq.assignment_id and ak.question_id = aq.question_id
  where aq.assignment_id = assignment_uuid and aq.question_id = left(question_key, 160);

  if response_kind is null then raise exception 'Question not found.'; end if;
  submitted_text := left(trim(coalesce(response_payload ->> 'text', '')), 500);

  if response_kind = 'multiple_choice' then
    if not (response_payload ? 'option') then raise exception 'Choose an answer.'; end if;
    submitted_option := (response_payload ->> 'option')::integer;
    if submitted_option < 0 or submitted_option >= jsonb_array_length(answer_options) then raise exception 'Choose a valid answer.'; end if;
    grade_result := case when expected_option is null then null else submitted_option = expected_option end;
  elsif response_kind = 'numeric' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    begin
      submitted_number := replace(replace(submitted_text, ',', ''), ' ', '')::numeric;
    exception when invalid_text_representation then
      submitted_number := null;
    end;
    grade_result := case
      when expected_number is null then null
      when submitted_number is null then false
      else abs(submitted_number - expected_number) <= coalesce(allowed_tolerance, 0)
    end;
  elsif response_kind = 'exact' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    if accepted is null or jsonb_array_length(accepted) = 0 then
      grade_result := null;
    else
      select exists (
        select 1 from jsonb_array_elements_text(accepted) item
        where lower(regexp_replace(trim(item), '\s+', '', 'g')) =
              lower(regexp_replace(submitted_text, '\s+', '', 'g'))
      ) into grade_result;
    end if;
  else
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    grade_result := null;
  end if;

  insert into public.assignment_responses (
    assignment_id, student_id, question_id, response, is_correct, checked_at, updated_at
  ) values (
    assignment_uuid, auth.uid(), left(question_key, 160), response_payload, grade_result,
    case when grade_result is null then null else now() end, now()
  )
  on conflict (assignment_id, student_id, question_id) do update set
    response = excluded.response,
    is_correct = excluded.is_correct,
    checked_at = excluded.checked_at,
    updated_at = now();

  insert into public.assignment_submissions (assignment_id, student_id, status, submitted_at, updated_at)
  values (assignment_uuid, auth.uid(), 'in_progress', null, now())
  on conflict (assignment_id, student_id) do update set
    status = 'in_progress', submitted_at = null, updated_at = now();

  result_label := case when grade_result is true then 'correct' when grade_result is false then 'incorrect' else 'saved' end;
  return query select grade_result, result_label;
end;
$$;

grant execute on function public.submit_assignment_response(uuid, text, jsonb) to authenticated;
