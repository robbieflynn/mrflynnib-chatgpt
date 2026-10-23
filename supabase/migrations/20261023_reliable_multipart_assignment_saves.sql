-- Route idempotent multipart saves through the dedicated part-level function.
-- This preserves the independent two-attempt allowance for each part instead
-- of sending part payloads through the legacy whole-question validation path.

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

  if selected_part <> '' then
    select submitted.is_correct, submitted.result
      into saved_correct, saved_result
    from public.submit_assignment_part_response(
      assignment_uuid,
      question_key,
      selected_part,
      left(trim(coalesce(response_payload ->> 'partAnswer', '')), 500)
    ) submitted;
  else
    select submitted.is_correct, submitted.result
      into saved_correct, saved_result
    from public.submit_assignment_response(assignment_uuid, question_key, response_payload) submitted;
  end if;

  update public.assignment_response_requests request
  set is_correct = saved_correct, result = saved_result
  where request.student_id = auth.uid() and request.request_id = request_uuid;

  return query select saved_correct, saved_result;
end;
$$;

revoke all on function public.submit_assignment_response_reliable(uuid, text, jsonb, uuid) from public;
grant execute on function public.submit_assignment_response_reliable(uuid, text, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
