-- Make assignment-answer retries safe during brief network or provider outages.

create table if not exists public.assignment_response_requests (
  student_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  assignment_id uuid not null,
  question_id text not null check (char_length(question_id) between 1 and 160),
  part_key text not null default '',
  is_correct boolean,
  result text,
  created_at timestamptz not null default now(),
  primary key (student_id, request_id),
  foreign key (assignment_id, question_id)
    references public.assignment_questions(assignment_id, question_id) on delete cascade
);

create index if not exists assignment_response_requests_created_idx
  on public.assignment_response_requests (created_at);

alter table public.assignment_response_requests enable row level security;
revoke all on public.assignment_response_requests from anon, authenticated;

create or replace function public.submit_assignment_response_reliable(
  assignment_uuid uuid,
  question_key text,
  response_payload jsonb,
  request_uuid uuid
)
returns table (is_correct boolean, result text)
language plpgsql security definer set search_path = ''
as $$
declare
  saved_correct boolean;
  saved_result text;
  selected_part text := left(trim(coalesce(response_payload ->> 'partKey', '')), 30);
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if request_uuid is null then raise exception 'A save request identifier is required.'; end if;

  insert into public.assignment_response_requests
    (student_id, request_id, assignment_id, question_id, part_key)
  values
    (auth.uid(), request_uuid, assignment_uuid, left(question_key, 160), selected_part)
  on conflict (student_id, request_id) do nothing;

  select request.is_correct, request.result
    into saved_correct, saved_result
  from public.assignment_response_requests request
  where request.student_id = auth.uid() and request.request_id = request_uuid
  for update;

  if saved_result is not null then
    return query select saved_correct, saved_result;
    return;
  end if;

  select submitted.is_correct, submitted.result
    into saved_correct, saved_result
  from public.submit_assignment_response(assignment_uuid, question_key, response_payload) submitted;

  update public.assignment_response_requests request
  set is_correct = saved_correct, result = saved_result
  where request.student_id = auth.uid() and request.request_id = request_uuid;

  return query select saved_correct, saved_result;
end;
$$;

revoke all on function public.submit_assignment_response_reliable(uuid, text, jsonb, uuid) from public;
grant execute on function public.submit_assignment_response_reliable(uuid, text, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
