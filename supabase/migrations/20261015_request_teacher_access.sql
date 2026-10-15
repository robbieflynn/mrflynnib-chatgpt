create or replace function public.request_teacher_access()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_role text;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request teacher access.';
  end if;

  select role, teacher_status
  into account_role, request_status
  from public.profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Your account profile could not be found.';
  end if;

  if account_role in ('teacher', 'admin') then
    return 'approved';
  end if;

  if request_status = 'pending' then
    return 'pending';
  end if;

  update public.profiles
  set teacher_status = 'pending',
      teacher_requested_at = now(),
      teacher_notification_sent_at = null,
      updated_at = now()
  where user_id = auth.uid()
    and role = 'student';

  return 'pending';
end;
$$;

revoke all on function public.request_teacher_access() from public;
revoke execute on function public.request_teacher_access() from anon;
grant execute on function public.request_teacher_access() to authenticated;
