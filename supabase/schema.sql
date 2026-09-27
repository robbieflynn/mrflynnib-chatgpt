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

-- One row means the student has self-marked this question as correct. The
-- bank column keeps IB and IGCSE progress in one account without relying on
-- question IDs being unique across both collections.
create table if not exists public.question_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank text not null check (char_length(bank) between 1 and 24),
  course text not null check (char_length(course) between 1 and 40),
  question_id text not null check (char_length(question_id) between 1 and 180),
  correct_at timestamptz not null default now(),
  primary key (user_id, bank, question_id)
);

alter table public.question_progress enable row level security;

revoke all on table public.question_progress from anon, authenticated;
grant select, insert, update, delete on table public.question_progress to authenticated;

drop policy if exists "Students can read their own question progress" on public.question_progress;
create policy "Students can read their own question progress"
on public.question_progress for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students can add their own question progress" on public.question_progress;
create policy "Students can add their own question progress"
on public.question_progress for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students can update their own question progress" on public.question_progress;
create policy "Students can update their own question progress"
on public.question_progress for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Students can remove their own question progress" on public.question_progress;
create policy "Students can remove their own question progress"
on public.question_progress for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create index if not exists question_progress_user_course_idx
on public.question_progress (user_id, bank, course, correct_at desc);
