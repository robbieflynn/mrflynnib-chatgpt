-- Teacher access policy:
--   * approved partner-school domains activate immediately;
--   * Teacher Plus journeys activate immediately so checkout is never blocked;
--   * every other free teacher request waits for administrator approval.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  teacher_selected boolean := new.raw_user_meta_data ->> 'account_type' = 'teacher';
  account_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
  immediate_teacher boolean;
begin
  immediate_teacher := teacher_selected and (
    account_domain in ('jess.sch.ae', 'beausoleil.ch', 'westminsteracademy.org.uk')
    or new.raw_user_meta_data ->> 'requested_plan' = 'teacher-plus'
  );

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
    case when immediate_teacher then 'teacher' else 'student' end,
    case when new.raw_user_meta_data ->> 'curriculum' = 'igcse' then 'igcse' else 'ib' end,
    case when immediate_teacher then 'approved' when teacher_selected then 'pending' else 'none' end,
    case when teacher_selected then now() else null end,
    case when immediate_teacher then now() else null end
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
  account_status text;
  account_domain text;
  requested_plan text;
  immediate_teacher boolean;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request teacher access.';
  end if;

  select profile.role, profile.teacher_status,
         lower(split_part(coalesce(account.email, ''), '@', 2)),
         account.raw_user_meta_data ->> 'requested_plan'
  into account_role, account_status, account_domain, requested_plan
  from public.profiles profile
  join auth.users account on account.id = profile.user_id
  where profile.user_id = auth.uid()
  for update of profile;

  if not found then
    raise exception 'Your account profile could not be found.';
  end if;

  if account_role in ('teacher', 'admin') then
    return 'approved';
  end if;

  immediate_teacher := account_domain in ('jess.sch.ae', 'beausoleil.ch', 'westminsteracademy.org.uk')
    or requested_plan = 'teacher-plus'
    or exists (
      select 1 from public.platform_entitlements entitlement
      where entitlement.user_id = auth.uid()
        and entitlement.product_code = 'teacher_plus_ib'
        and entitlement.status = 'active'
        and (entitlement.expires_at is null or entitlement.expires_at > now())
    );

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('account_type', 'teacher')
  where id = auth.uid();

  if immediate_teacher then
    update public.profiles
    set role = 'teacher',
        teacher_status = 'approved',
        teacher_requested_at = coalesce(teacher_requested_at, now()),
        teacher_notification_sent_at = coalesce(teacher_notification_sent_at, now()),
        updated_at = now()
    where user_id = auth.uid();
    return 'approved';
  end if;

  update public.profiles
  set teacher_status = 'pending',
      teacher_requested_at = coalesce(teacher_requested_at, now()),
      teacher_notification_sent_at = case when account_status = 'pending' then teacher_notification_sent_at else null end,
      updated_at = now()
  where user_id = auth.uid();

  return 'pending';
end;
$$;

revoke all on function public.request_teacher_access() from public;
revoke execute on function public.request_teacher_access() from anon;
grant execute on function public.request_teacher_access() to authenticated;

-- Repair partner-school teachers who chose Teacher before this policy was
-- applied but were left with a student role. The existing school-access
-- trigger grants confirmed accounts Teacher Plus after the role changes.
update public.profiles profile
set role = 'teacher',
    teacher_status = 'approved',
    teacher_requested_at = coalesce(profile.teacher_requested_at, now()),
    teacher_notification_sent_at = coalesce(profile.teacher_notification_sent_at, now()),
    updated_at = now()
from auth.users account
where account.id = profile.user_id
  and profile.role = 'student'
  and account.raw_user_meta_data ->> 'account_type' = 'teacher'
  and lower(split_part(coalesce(account.email, ''), '@', 2)) in (
    'jess.sch.ae',
    'beausoleil.ch',
    'westminsteracademy.org.uk'
  );

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
