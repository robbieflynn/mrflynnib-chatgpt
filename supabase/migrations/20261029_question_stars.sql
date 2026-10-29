-- Saved questions follow a signed-in student across devices in each curriculum.

create table if not exists public.question_stars (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank text not null check (bank in ('ib', 'igcse')),
  question_id text not null check (char_length(question_id) between 1 and 160),
  created_at timestamptz not null default now(),
  primary key (user_id, bank, question_id)
);

alter table public.question_stars enable row level security;

drop policy if exists "Students read own question stars" on public.question_stars;
create policy "Students read own question stars" on public.question_stars for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Students create own question stars" on public.question_stars;
create policy "Students create own question stars" on public.question_stars for insert
  with check ((select auth.uid()) = user_id and bank in ('ib', 'igcse'));

drop policy if exists "Students delete own question stars" on public.question_stars;
create policy "Students delete own question stars" on public.question_stars for delete
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.question_stars to authenticated;
