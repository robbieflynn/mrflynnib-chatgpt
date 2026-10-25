-- Automatic Plus access for Rob's approved partner-school email domains.
-- Access is granted only after Supabase has confirmed ownership of the email.
-- Students receive their selected (or existing class) course. Approved teachers
-- and administrators receive Teacher Plus for all four IB courses.

create or replace function public.school_plus_product_for_user(account_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  account_domain text;
  account_confirmed_at timestamptz;
  account_metadata jsonb;
  account_role text;
  account_curriculum text;
  selected_course text;
  joined_course text;
begin
  select
    lower(split_part(coalesce(users.email, ''), '@', 2)),
    users.email_confirmed_at,
    coalesce(users.raw_user_meta_data, '{}'::jsonb),
    coalesce(profiles.role, 'student'),
    coalesce(profiles.curriculum, case when users.raw_user_meta_data ->> 'curriculum' = 'igcse' then 'igcse' else 'ib' end)
  into account_domain, account_confirmed_at, account_metadata, account_role, account_curriculum
  from auth.users users
  left join public.profiles profiles on profiles.user_id = users.id
  where users.id = account_id;

  if account_confirmed_at is null
     or account_domain not in ('jess.sch.ae', 'beausoleil.ch', 'westminsteracademy.org.uk') then
    return null;
  end if;

  if account_curriculum = 'igcse' then
    return 'course_igcse';
  end if;

  if account_role in ('teacher', 'admin') then
    return 'teacher_plus_ib';
  end if;

  -- A teacher request must still be approved before all-course access is
  -- activated. Do not temporarily treat a pending teacher as a student.
  if account_metadata ->> 'account_type' = 'teacher' then
    return null;
  end if;

  selected_course := lower(trim(coalesce(account_metadata ->> 'primary_course', '')));
  if selected_course in ('aa-hl', 'aa-sl', 'ai-hl', 'ai-sl') then
    return 'course_ib_' || replace(selected_course, '-', '_');
  end if;

  select classes.course
  into joined_course
  from public.class_memberships memberships
  join public.classes classes on classes.id = memberships.class_id
  where memberships.student_id = account_id
    and classes.bank = 'ib'
    and not classes.archived
  order by memberships.joined_at desc
  limit 1;

  if joined_course in ('AA HL', 'AA SL', 'AI HL', 'AI SL') then
    return 'course_ib_' || lower(replace(joined_course, ' ', '_'));
  end if;

  -- The older JESS accounts pre-date course selection. AA HL is the only
  -- existing JESS class, so keep those accounts usable immediately.
  if account_domain = 'jess.sch.ae' then
    return 'course_ib_aa_hl';
  end if;

  return null;
end;
$$;

revoke all on function public.school_plus_product_for_user(uuid) from public;

create or replace function public.upsert_school_plus_access(account_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_code text;
  account_domain text;
begin
  if account_id is null then
    return 0;
  end if;

  product_code := public.school_plus_product_for_user(account_id);
  if product_code is null then
    update public.platform_entitlements
    set status = 'revoked', updated_at = now()
    where external_provider = 'school-domain'
      and external_reference = 'school-domain:' || account_id::text
      and status <> 'revoked';
    return 0;
  end if;

  select lower(split_part(coalesce(users.email, ''), '@', 2))
  into account_domain
  from auth.users users
  where users.id = account_id;

  insert into public.platform_entitlements (
    user_id,
    product_code,
    status,
    source,
    starts_at,
    expires_at,
    external_provider,
    external_reference,
    metadata
  ) values (
    account_id,
    product_code,
    'active',
    'school',
    now(),
    null,
    'school-domain',
    'school-domain:' || account_id::text,
    jsonb_build_object('domain', account_domain, 'automatic', true)
  )
  on conflict (external_provider, external_reference)
    where external_provider is not null and external_reference is not null
  do update set
    product_code = excluded.product_code,
    status = 'active',
    source = 'school',
    expires_at = null,
    metadata = excluded.metadata,
    updated_at = now();

  return 1;
end;
$$;

revoke all on function public.upsert_school_plus_access(uuid) from public;

create or replace function public.claim_school_plus_access()
returns integer
language sql
security definer
set search_path = ''
as $$
  select public.upsert_school_plus_access(auth.uid());
$$;

revoke all on function public.claim_school_plus_access() from public;
grant execute on function public.claim_school_plus_access() to authenticated;

create or replace function public.sync_school_plus_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.upsert_school_plus_access(new.id);
  return new;
end;
$$;

create or replace function public.sync_school_plus_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.upsert_school_plus_access(new.user_id);
  return new;
end;
$$;

revoke all on function public.sync_school_plus_from_auth_user() from public;
revoke all on function public.sync_school_plus_from_profile() from public;

drop trigger if exists sync_school_plus_on_auth_user on auth.users;
create trigger sync_school_plus_on_auth_user
  after insert or update of email_confirmed_at, email, raw_user_meta_data on auth.users
  for each row execute procedure public.sync_school_plus_from_auth_user();

drop trigger if exists sync_school_plus_on_profile on public.profiles;
create trigger sync_school_plus_on_profile
  after insert or update of role, curriculum on public.profiles
  for each row execute procedure public.sync_school_plus_from_profile();

-- Existing confirmed accounts receive the same entitlement immediately.
insert into public.platform_entitlements (
  user_id,
  product_code,
  status,
  source,
  starts_at,
  expires_at,
  external_provider,
  external_reference,
  metadata
)
select
  users.id,
  products.product_code,
  'active',
  'school',
  now(),
  null,
  'school-domain',
  'school-domain:' || users.id::text,
  jsonb_build_object(
    'domain', lower(split_part(users.email, '@', 2)),
    'automatic', true
  )
from auth.users users
cross join lateral (
  select public.school_plus_product_for_user(users.id) as product_code
) products
where products.product_code is not null
on conflict (external_provider, external_reference)
  where external_provider is not null and external_reference is not null
do update set
  product_code = excluded.product_code,
  status = 'active',
  source = 'school',
  expires_at = null,
  metadata = excluded.metadata,
  updated_at = now();

