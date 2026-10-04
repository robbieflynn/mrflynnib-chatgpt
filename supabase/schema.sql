-- Run in the Supabase SQL editor. The website inserts through the server-only
-- service role key; no public insert policy is required.

create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('contact', 'tutoring', 'school')),
  name text not null,
  email text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed', 'spam')),
  source text not null default 'website'
);

alter table public.enquiries enable row level security;

-- Only trusted server-side processes using the service role should access this table.
create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);
create index if not exists enquiries_kind_idx on public.enquiries (kind);
create index if not exists enquiries_status_idx on public.enquiries (status);

-- Student accounts use Supabase Auth. These public tables contain only the
-- profile and question-bank records owned by the signed-in user.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank text not null check (bank in ('ib', 'igcse')),
  question_id text not null check (char_length(question_id) between 1 and 160),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, bank, question_id)
);

create table if not exists public.whiteboard_documents (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank text not null check (bank in ('ib', 'igcse')),
  question_id text not null check (char_length(question_id) between 1 and 160),
  document jsonb not null default '{"version":1,"paper":"squared","actions":[]}'::jsonb,
  document_version integer not null default 1 check (document_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, bank, question_id)
);

alter table public.profiles enable row level security;
alter table public.question_progress enable row level security;
alter table public.whiteboard_documents enable row level security;

drop policy if exists "Students read own profile" on public.profiles;
create policy "Students read own profile" on public.profiles for select using ((select auth.uid()) = user_id);
drop policy if exists "Students update own profile" on public.profiles;
create policy "Students update own profile" on public.profiles for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Students read own progress" on public.question_progress;
create policy "Students read own progress" on public.question_progress for select using ((select auth.uid()) = user_id);
drop policy if exists "Students insert own progress" on public.question_progress;
create policy "Students insert own progress" on public.question_progress for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Students update own progress" on public.question_progress;
create policy "Students update own progress" on public.question_progress for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Students delete own progress" on public.question_progress;
create policy "Students delete own progress" on public.question_progress for delete using ((select auth.uid()) = user_id);

drop policy if exists "Students read own whiteboards" on public.whiteboard_documents;
create policy "Students read own whiteboards" on public.whiteboard_documents for select using ((select auth.uid()) = user_id);
drop policy if exists "Students insert own whiteboards" on public.whiteboard_documents;
create policy "Students insert own whiteboards" on public.whiteboard_documents for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Students update own whiteboards" on public.whiteboard_documents;
create policy "Students update own whiteboards" on public.whiteboard_documents for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Students delete own whiteboards" on public.whiteboard_documents;
create policy "Students delete own whiteboards" on public.whiteboard_documents for delete using ((select auth.uid()) = user_id);

create index if not exists question_progress_user_completed_idx on public.question_progress (user_id, completed);
create index if not exists whiteboard_documents_user_updated_idx on public.whiteboard_documents (user_id, updated_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
