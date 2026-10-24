-- Verified Teachable access is staged by normalised email, then claimed only
-- after the owner signs in with that confirmed email address. The staging
-- table is deliberately invisible to ordinary accounts because it contains
-- migration-only customer data.

create table if not exists public.course_access_migrations (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null check (
    char_length(normalized_email) between 3 and 254
    and normalized_email = lower(trim(normalized_email))
  ),
  product_code text not null check (product_code in (
    'course_ib_aa_hl',
    'course_ib_aa_sl',
    'course_ib_ai_hl',
    'course_ib_ai_sl',
    'course_igcse'
  )),
  source text not null default 'teachable' check (source in ('teachable', 'school')),
  evidence_type text not null check (char_length(evidence_type) between 1 and 100),
  external_reference text not null check (char_length(external_reference) between 1 and 200),
  starts_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'verified' check (status in ('verified', 'claimed', 'held', 'expired')),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_email, product_code),
  unique (external_reference),
  check (expires_at is null or expires_at > starts_at),
  check (
    (status = 'claimed' and claimed_by is not null and claimed_at is not null)
    or status <> 'claimed'
  )
);

create index if not exists course_access_migrations_claim_idx
  on public.course_access_migrations (normalized_email, status, expires_at);

alter table public.course_access_migrations enable row level security;
revoke all on public.course_access_migrations from anon, authenticated;

create or replace function public.claim_verified_course_access()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  account_email text;
  confirmed_at timestamptz;
  migration_record public.course_access_migrations%rowtype;
  claimed_count integer := 0;
begin
  if account_id is null then
    return 0;
  end if;

  select lower(trim(users.email)), users.email_confirmed_at
    into account_email, confirmed_at
  from auth.users users
  where users.id = account_id;

  if account_email is null or confirmed_at is null then
    return 0;
  end if;

  for migration_record in
    select migrations.*
    from public.course_access_migrations migrations
    where migrations.normalized_email = account_email
      and migrations.status = 'verified'
      and (migrations.expires_at is null or migrations.expires_at > now())
    for update skip locked
  loop
    if not exists (
      select 1
      from public.platform_entitlements entitlements
      where entitlements.user_id = account_id
        and entitlements.product_code = migration_record.product_code
        and entitlements.status = 'active'
        and (entitlements.expires_at is null or entitlements.expires_at > now())
    ) then
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
        migration_record.product_code,
        'active',
        migration_record.source,
        migration_record.starts_at,
        migration_record.expires_at,
        'teachable-migration',
        migration_record.id::text,
        jsonb_build_object(
          'migration_record_id', migration_record.id,
          'evidence_type', migration_record.evidence_type
        )
      ) on conflict do nothing;
    end if;

    update public.course_access_migrations
    set status = 'claimed',
        claimed_by = account_id,
        claimed_at = now(),
        updated_at = now()
    where id = migration_record.id;

    claimed_count := claimed_count + 1;
  end loop;

  return claimed_count;
end;
$$;

revoke all on function public.claim_verified_course_access() from public;
grant execute on function public.claim_verified_course_access() to authenticated;
