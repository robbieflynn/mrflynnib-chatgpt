-- Native learning, payment fulfilment and existing-customer transfer requests.

-- A regular unique index still allows multiple rows with null provider values,
-- while giving the Stripe webhook a conflict target PostgREST can use.
drop index if exists public.platform_entitlements_external_reference_idx;
create unique index platform_entitlements_external_reference_idx
  on public.platform_entitlements (external_provider, external_reference);

create table if not exists public.course_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum text not null check (curriculum in ('ib', 'igcse')),
  course_id text not null check (char_length(course_id) between 1 and 40),
  lesson_id text not null check (char_length(lesson_id) between 1 and 100),
  completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, curriculum, course_id, lesson_id)
);

create table if not exists public.course_platform_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum text not null check (curriculum in ('ib', 'igcse')),
  last_course_id text,
  last_lesson_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, curriculum)
);

create table if not exists public.course_access_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum text not null check (curriculum in ('ib', 'igcse')),
  product_code text not null check (char_length(product_code) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists course_access_claims_one_pending_idx
  on public.course_access_claims (user_id, product_code) where status = 'pending';

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  provider_event_id text primary key,
  event_type text not null,
  status text not null check (status in ('processing', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists organization_memberships_user_idx on public.organization_memberships (user_id, status);
create index if not exists organization_license_seats_user_idx on public.organization_license_seats (user_id) where revoked_at is null;

alter table public.course_lesson_progress enable row level security;
alter table public.course_platform_state enable row level security;
alter table public.course_access_claims enable row level security;
alter table public.billing_customers enable row level security;
alter table public.payment_events enable row level security;

create policy "Users manage their own lesson progress" on public.course_lesson_progress
  for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "Users manage their own course state" on public.course_platform_state
  for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "Users read their own access claims" on public.course_access_claims
  for select using (user_id = auth.uid() or public.is_admin());
create policy "Users create their own pending access claims" on public.course_access_claims
  for insert with check (user_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null);
create policy "Administrators review access claims" on public.course_access_claims
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.course_lesson_progress to authenticated;
grant select, insert, update, delete on public.course_platform_state to authenticated;
grant select, insert on public.course_access_claims to authenticated;
grant update on public.course_access_claims to authenticated;
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
