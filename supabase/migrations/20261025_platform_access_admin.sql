-- Owner-managed course access and secure, auditable free-access codes.

create table if not exists public.platform_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  code_hint text not null check (char_length(code_hint) between 5 and 32),
  product_code text not null check (char_length(product_code) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'disabled')),
  access_days integer check (access_days is null or access_days between 1 and 3650),
  max_redemptions integer not null default 1 check (max_redemptions between 1 and 10000),
  redemption_count integer not null default 0 check (redemption_count between 0 and max_redemptions),
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.platform_access_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid not null references public.platform_entitlements(id) on delete restrict,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create index if not exists platform_access_codes_status_idx
  on public.platform_access_codes (status, expires_at, created_at desc);
create index if not exists platform_access_code_redemptions_user_idx
  on public.platform_access_code_redemptions (user_id, redeemed_at desc);

alter table public.platform_access_codes enable row level security;
alter table public.platform_access_code_redemptions enable row level security;
revoke all on public.platform_access_codes from anon, authenticated;
revoke all on public.platform_access_code_redemptions from anon, authenticated;

create or replace function public.redeem_platform_access_code(raw_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  normalized_code text := regexp_replace(upper(coalesce(raw_code, '')), '[^A-Z0-9]', '', 'g');
  code_row public.platform_access_codes%rowtype;
  entitlement_id uuid;
  entitlement_expiry timestamptz;
begin
  if account_id is null then
    return jsonb_build_object('status', 'signed_out');
  end if;

  if char_length(normalized_code) < 8 or char_length(normalized_code) > 64 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select access_code.*
  into code_row
  from public.platform_access_codes access_code
  where access_code.code_hash = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
    and access_code.status = 'active'
    and (access_code.expires_at is null or access_code.expires_at > now())
  for update;

  if code_row.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (
    select 1 from public.platform_access_code_redemptions redemption
    where redemption.code_id = code_row.id and redemption.user_id = account_id
  ) then
    return jsonb_build_object('status', 'already_redeemed', 'product_code', code_row.product_code);
  end if;

  if code_row.redemption_count >= code_row.max_redemptions then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if not exists (
    select 1 from public.profiles profile
    where profile.user_id = account_id
      and (
        profile.role = 'admin'
        or (code_row.product_code = 'course_igcse' and profile.curriculum = 'igcse')
        or (code_row.product_code <> 'course_igcse' and profile.curriculum = 'ib')
      )
  ) then
    return jsonb_build_object('status', 'wrong_area');
  end if;

  if code_row.product_code = 'teacher_plus_ib' and not exists (
    select 1 from public.profiles profile
    where profile.user_id = account_id and profile.role in ('teacher', 'admin')
  ) then
    return jsonb_build_object('status', 'teacher_required');
  end if;

  if exists (
    select 1 from public.platform_entitlements entitlement
    where entitlement.user_id = account_id
      and entitlement.product_code = code_row.product_code
      and entitlement.status = 'active'
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  ) then
    return jsonb_build_object('status', 'already_active', 'product_code', code_row.product_code);
  end if;

  entitlement_expiry := case
    when code_row.access_days is null then null
    else now() + make_interval(days => code_row.access_days)
  end;

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
    code_row.product_code,
    'active',
    'promotion',
    now(),
    entitlement_expiry,
    'access-code',
    code_row.id::text || ':' || account_id::text,
    jsonb_build_object('code_id', code_row.id, 'code_hint', code_row.code_hint)
  ) returning id into entitlement_id;

  insert into public.platform_access_code_redemptions (code_id, user_id, entitlement_id)
  values (code_row.id, account_id, entitlement_id);

  update public.platform_access_codes
  set redemption_count = redemption_count + 1, updated_at = now()
  where id = code_row.id;

  return jsonb_build_object(
    'status', 'redeemed',
    'product_code', code_row.product_code,
    'expires_at', entitlement_expiry
  );
end;
$$;

revoke all on function public.redeem_platform_access_code(text) from public;
revoke execute on function public.redeem_platform_access_code(text) from anon;
grant execute on function public.redeem_platform_access_code(text) to authenticated;

