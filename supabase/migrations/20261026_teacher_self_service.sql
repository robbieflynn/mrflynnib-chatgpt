-- Teacher accounts are self-service. Selecting Teacher at sign-up creates a
-- teacher profile immediately; existing users can convert the same account
-- from the teacher entry route without losing saved work.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles
    (user_id, display_name, email, role, curriculum, teacher_status, teacher_requested_at, teacher_notification_sent_at)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')),
      ''
    ), 80),
    left(coalesce(new.email, ''), 254),
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then 'teacher' else 'student' end,
    case when new.raw_user_meta_data ->> 'curriculum' = 'igcse' then 'igcse' else 'ib' end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then 'approved' else 'none' end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then now() else null end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then now() else null end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.request_teacher_access()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_role text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a teacher account.';
  end if;

  select role
  into account_role
  from public.profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Your account profile could not be found.';
  end if;

  if account_role in ('teacher', 'admin') then
    return 'approved';
  end if;

  update public.profiles
  set role = 'teacher',
      teacher_status = 'approved',
      teacher_requested_at = coalesce(teacher_requested_at, now()),
      teacher_notification_sent_at = coalesce(teacher_notification_sent_at, now()),
      updated_at = now()
  where user_id = auth.uid()
    and role = 'student';

  return 'approved';
end;
$$;

revoke all on function public.request_teacher_access() from public;
revoke execute on function public.request_teacher_access() from anon;
grant execute on function public.request_teacher_access() to authenticated;

-- Repair people who previously selected Teacher but were stored as students,
-- together with all still-pending teacher requests from the old workflow.
update public.profiles profile
set role = 'teacher',
    teacher_status = 'approved',
    teacher_requested_at = coalesce(profile.teacher_requested_at, now()),
    teacher_notification_sent_at = coalesce(profile.teacher_notification_sent_at, now()),
    updated_at = now()
from auth.users account
where account.id = profile.user_id
  and profile.role = 'student'
  and (
    profile.teacher_status = 'pending'
    or account.raw_user_meta_data ->> 'account_type' = 'teacher'
  );

-- Re-evaluate partner-school access now that teacher roles are correct. This
-- gives confirmed JESS, Beau Soleil and Westminster teachers Teacher Plus.
select public.upsert_school_plus_access(profile.user_id)
from public.profiles profile
join auth.users account on account.id = profile.user_id
where profile.role in ('teacher', 'admin')
  and account.email_confirmed_at is not null
  and lower(split_part(coalesce(account.email, ''), '@', 2)) in (
    'jess.sch.ae',
    'beausoleil.ch',
    'westminsteracademy.org.uk'
  );
