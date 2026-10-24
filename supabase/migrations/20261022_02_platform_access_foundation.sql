-- Paid access and lightweight school licensing foundations.
-- Teachers continue to own and manage their own classes. Organisations group
-- licences and teachers for billing without introducing a second class model.

create table if not exists public.platform_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null check (char_length(product_code) between 1 and 80),
  status text not null default 'active' check (status in ('pending', 'active', 'expired', 'revoked')),
  source text not null check (source in ('stripe', 'teachable', 'school', 'admin', 'promotion')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  external_provider text,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (external_provider is null or char_length(external_provider) <= 40),
  check (external_reference is null or char_length(external_reference) <= 200)
);

create unique index if not exists platform_entitlements_external_reference_idx
  on public.platform_entitlements (external_provider, external_reference)
  where external_provider is not null and external_reference is not null;
create index if not exists platform_entitlements_user_active_idx
  on public.platform_entitlements (user_id, status, expires_at);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  curriculum text not null default 'ib' check (curriculum in ('ib', 'igcse')),
  billing_email text not null default '' check (char_length(billing_email) <= 254),
  status text not null default 'active' check (status in ('prospect', 'pilot', 'active', 'expired', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role in ('billing_contact', 'teacher')),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.organization_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_code text not null check (char_length(product_code) between 1 and 80),
  status text not null default 'active' check (status in ('pending', 'pilot', 'active', 'expired', 'revoked')),
  seat_limit integer check (seat_limit is null or seat_limit > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_provider text,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.organization_license_seats (
  license_id uuid not null references public.organization_licenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (license_id, user_id)
);

alter table public.classes add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create index if not exists classes_organization_id_idx on public.classes (organization_id) where organization_id is not null;

alter table public.platform_entitlements enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_licenses enable row level security;
alter table public.organization_license_seats enable row level security;

create or replace function public.is_organization_member(organization_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_uuid
      and membership.user_id = account_id
      and membership.status = 'active'
  )
$$;

create or replace function public.is_organization_billing_contact(organization_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_uuid
      and membership.user_id = account_id
      and membership.role = 'billing_contact'
      and membership.status = 'active'
  )
$$;

grant execute on function public.is_organization_member(uuid, uuid) to authenticated;
grant execute on function public.is_organization_billing_contact(uuid, uuid) to authenticated;

drop policy if exists "Users can read their platform entitlements" on public.platform_entitlements;
create policy "Users can read their platform entitlements"
  on public.platform_entitlements for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members can read their organization" on public.organizations;
create policy "Members can read their organization"
  on public.organizations for select
  using (public.is_organization_member(id) or public.is_admin());

drop policy if exists "Members can read relevant organization memberships" on public.organization_memberships;
create policy "Members can read relevant organization memberships"
  on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or public.is_organization_billing_contact(organization_id)
    or public.is_admin()
  );

drop policy if exists "Members can read organization licences" on public.organization_licenses;
create policy "Members can read organization licences"
  on public.organization_licenses for select
  using (public.is_organization_member(organization_id) or public.is_admin());

drop policy if exists "Users can read relevant organization seats" on public.organization_license_seats;
create policy "Users can read relevant organization seats"
  on public.organization_license_seats for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organization_licenses licence
      where licence.id = organization_license_seats.license_id
        and public.is_organization_billing_contact(licence.organization_id)
    )
    or public.is_admin()
  );

-- Entitlements, organisation membership and licence changes are intentionally
-- server/admin controlled. No authenticated insert, update or delete policies
-- are granted here. Stripe webhooks and administrative workflows use the
-- service-role client and leave an auditable source/reference on each record.
