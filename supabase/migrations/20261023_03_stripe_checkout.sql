-- Auditable one-time Stripe course purchases. Test and live Stripe customers
-- are kept separate so preview payments can never contaminate production.

alter table public.billing_customers
  add column if not exists livemode boolean not null default false;

alter table public.billing_customers
  drop constraint if exists billing_customers_pkey;
alter table public.billing_customers
  add primary key (user_id, livemode);

create table if not exists public.platform_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null check (char_length(product_code) between 1 and 80),
  provider text not null default 'stripe' check (provider = 'stripe'),
  checkout_session_id text not null unique check (char_length(checkout_session_id) between 1 and 200),
  payment_intent_id text unique check (payment_intent_id is null or char_length(payment_intent_id) between 1 and 200),
  customer_id text check (customer_id is null or char_length(customer_id) between 1 and 200),
  livemode boolean not null,
  status text not null check (status in ('pending', 'paid', 'failed', 'partially_refunded', 'refunded')),
  amount_total integer not null default 0 check (amount_total >= 0),
  amount_refunded integer not null default 0 check (amount_refunded >= 0 and amount_refunded <= amount_total),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  access_days integer not null check (access_days between 1 and 3650),
  access_starts_at timestamptz,
  access_expires_at timestamptz,
  purchased_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_expires_at is null or access_starts_at is null or access_expires_at > access_starts_at)
);

create index if not exists platform_purchases_user_idx
  on public.platform_purchases (user_id, status, created_at desc);

alter table public.platform_purchases enable row level security;
revoke all on public.platform_purchases from anon, authenticated;
