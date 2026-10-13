create table if not exists public.saved_tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  course text not null check (course in ('AA HL', 'AA SL', 'AI HL', 'AI SL')),
  paper text not null check (paper in ('Paper 1', 'Paper 2', 'Paper 1 and Paper 2')),
  question_count integer not null check (question_count between 1 and 50),
  total_marks integer not null check (total_marks between 1 and 1000),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_tests enable row level security;

drop policy if exists "Teachers manage own saved tests" on public.saved_tests;
create policy "Teachers manage own saved tests" on public.saved_tests for all
  using (teacher_id = (select auth.uid()) and public.is_teacher())
  with check (teacher_id = (select auth.uid()) and public.is_teacher());

create index if not exists saved_tests_teacher_updated_idx
  on public.saved_tests (teacher_id, updated_at desc);
