create table if not exists public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null default '' check (char_length(customer_email) <= 254),
  course_code text not null check (course_code in ('AA HL', 'AA SL', 'AI HL', 'AI SL')),
  course_slug text not null check (char_length(course_slug) between 1 and 100),
  plan_code text not null check (plan_code in ('three-months', 'one-year', 'two-years')),
  access_months integer not null check (access_months in (3, 12, 24)),
  amount integer not null check (amount > 0),
  currency_code text not null check (currency_code = 'USD'),
  status text not null default 'creating' check (status in ('creating', 'creation_failed', 'requires_payment_instrument', 'requires_user_action', 'pending', 'completed', 'failed', 'canceled')),
  is_test boolean not null default true,
  ziina_payment_intent_id text unique,
  ziina_operation_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_code text not null check (course_code in ('AA HL', 'AA SL', 'AI HL', 'AI SL')),
  access_starts_at timestamptz not null,
  access_ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  source_order_id uuid not null unique references public.checkout_orders(id) on delete restrict,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code),
  check (access_ends_at > access_starts_at)
);

create index if not exists checkout_orders_user_created_idx on public.checkout_orders (user_id, created_at desc);
create index if not exists checkout_orders_intent_idx on public.checkout_orders (ziina_payment_intent_id);
create index if not exists course_entitlements_active_idx on public.course_entitlements (user_id, access_ends_at) where status = 'active';

alter table public.checkout_orders enable row level security;
alter table public.course_entitlements enable row level security;

drop policy if exists "Customers can view their checkout orders" on public.checkout_orders;
create policy "Customers can view their checkout orders" on public.checkout_orders
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Customers can view their course entitlements" on public.course_entitlements;
create policy "Customers can view their course entitlements" on public.course_entitlements
for select using (auth.uid() = user_id or public.is_admin());

grant select on public.checkout_orders to authenticated;
grant select on public.course_entitlements to authenticated;

create or replace function public.grant_course_entitlement_for_order(order_uuid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.checkout_orders%rowtype;
  current_entitlement public.course_entitlements%rowtype;
  access_start timestamptz;
  access_end timestamptz;
begin
  select * into selected_order
  from public.checkout_orders
  where id = order_uuid
  for update;

  if selected_order.id is null or selected_order.status <> 'completed' then
    raise exception 'A completed checkout order is required.';
  end if;

  select * into current_entitlement
  from public.course_entitlements
  where user_id = selected_order.user_id and course_code = selected_order.course_code
  for update;

  if current_entitlement.source_order_id = selected_order.id then
    return;
  end if;

  access_start := greatest(now(), coalesce(current_entitlement.access_ends_at, now()));
  access_end := access_start + make_interval(months => selected_order.access_months);

  insert into public.course_entitlements (
    user_id, course_code, access_starts_at, access_ends_at, status,
    source_order_id, is_test, created_at, updated_at
  ) values (
    selected_order.user_id,
    selected_order.course_code,
    coalesce(current_entitlement.access_starts_at, now()),
    access_end,
    'active',
    selected_order.id,
    selected_order.is_test,
    now(),
    now()
  )
  on conflict (user_id, course_code) do update set
    access_ends_at = excluded.access_ends_at,
    status = 'active',
    source_order_id = excluded.source_order_id,
    is_test = excluded.is_test,
    updated_at = now();
end;
$$;

revoke all on function public.grant_course_entitlement_for_order(uuid) from public, anon, authenticated;
grant execute on function public.grant_course_entitlement_for_order(uuid) to service_role;
