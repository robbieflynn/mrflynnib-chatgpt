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
  email text not null default '' check (char_length(email) <= 254),
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  teacher_status text not null default 'none' check (teacher_status in ('none', 'pending', 'approved', 'rejected')),
  teacher_requested_at timestamptz,
  teacher_notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists teacher_status text not null default 'none';
alter table public.profiles add column if not exists teacher_requested_at timestamptz;
alter table public.profiles add column if not exists teacher_notification_sent_at timestamptz;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));
alter table public.profiles drop constraint if exists profiles_teacher_status_check;
alter table public.profiles add constraint profiles_teacher_status_check check (teacher_status in ('none', 'pending', 'approved', 'rejected'));
update public.profiles p set email = coalesce(u.email, '') from auth.users u where p.user_id = u.id and p.email = '';

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

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  bank text not null check (bank in ('ib', 'igcse')),
  course text not null check (course in ('AA HL', 'AA SL', 'AI HL', 'AI SL', 'IGCSE Higher')),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,10}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_memberships (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  instructions text not null default '' check (char_length(instructions) <= 1500),
  due_at timestamptz,
  status text not null default 'published' check (status in ('draft', 'published', 'closed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignment_questions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  bank text not null check (bank in ('ib', 'igcse')),
  position integer not null check (position >= 0),
  title_snapshot text not null default '',
  topic_snapshot text not null default '',
  primary key (assignment_id, question_id)
);

create table if not exists public.assignment_question_progress (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_id, question_id),
  foreign key (assignment_id, question_id) references public.assignment_questions(assignment_id, question_id) on delete cascade
);

create table if not exists public.assignment_submissions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table public.profiles enable row level security;
alter table public.question_progress enable row level security;
alter table public.whiteboard_documents enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_question_progress enable row level security;
alter table public.assignment_submissions enable row level security;

create or replace function public.is_teacher(account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = account_id and role in ('teacher', 'admin')) $$;

create or replace function public.is_admin(account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = account_id and role = 'admin') $$;

create or replace function public.teaches_class(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.classes where id = class_uuid and teacher_id = account_id) $$;

create or replace function public.is_class_member(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.class_memberships where class_id = class_uuid and student_id = account_id) $$;

create or replace function public.can_access_assignment(assignment_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = assignment_uuid
      and (a.teacher_id = account_id or (a.status = 'published' and public.is_class_member(a.class_id, account_id)))
  )
$$;

create or replace function public.join_class_by_code(raw_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare selected_class uuid;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  select id into selected_class from public.classes where join_code = upper(trim(raw_code)) and not archived;
  if selected_class is null then raise exception 'That class code was not found.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Teacher accounts cannot join student classes.'; end if;
  insert into public.class_memberships (class_id, student_id) values (selected_class, auth.uid()) on conflict do nothing;
  return selected_class;
end;
$$;

grant execute on function public.join_class_by_code(text) to authenticated;

create or replace function public.mark_teacher_notification_sent()
returns void language sql security definer set search_path = ''
as $$
  update public.profiles set teacher_notification_sent_at = now(), updated_at = now()
  where user_id = auth.uid() and teacher_status = 'pending' and teacher_notification_sent_at is null
$$;
grant execute on function public.mark_teacher_notification_sent() to authenticated;

drop policy if exists "Students read own profile" on public.profiles;
create policy "Students read own profile" on public.profiles for select using ((select auth.uid()) = user_id);
drop policy if exists "Students update own profile" on public.profiles;

drop policy if exists "Teachers read class student profiles" on public.profiles;
create policy "Teachers read class student profiles" on public.profiles for select using (
  exists (select 1 from public.class_memberships cm where cm.student_id = profiles.user_id and public.teaches_class(cm.class_id))
);
drop policy if exists "Admins read teacher applications" on public.profiles;
create policy "Admins read teacher applications" on public.profiles for select using (public.is_admin());
drop policy if exists "Admins update teacher applications" on public.profiles;
create policy "Admins update teacher applications" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

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

drop policy if exists "Teachers read assigned whiteboards" on public.whiteboard_documents;
create policy "Teachers read assigned whiteboards" on public.whiteboard_documents for select using (
  exists (
    select 1 from public.assignment_questions aq
    join public.assignments a on a.id = aq.assignment_id
    where aq.bank = whiteboard_documents.bank and aq.question_id = whiteboard_documents.question_id
      and a.teacher_id = (select auth.uid())
      and public.is_class_member(a.class_id, whiteboard_documents.user_id)
  )
);

drop policy if exists "Teachers manage own classes" on public.classes;
create policy "Teachers manage own classes" on public.classes for all using (teacher_id = (select auth.uid()) and public.is_teacher()) with check (teacher_id = (select auth.uid()) and public.is_teacher());
drop policy if exists "Students read joined classes" on public.classes;
create policy "Students read joined classes" on public.classes for select using (public.is_class_member(id));

drop policy if exists "Teachers read class memberships" on public.class_memberships;
create policy "Teachers read class memberships" on public.class_memberships for select using (public.teaches_class(class_id));
drop policy if exists "Students read own memberships" on public.class_memberships;
create policy "Students read own memberships" on public.class_memberships for select using (student_id = (select auth.uid()));

drop policy if exists "Teachers manage own assignments" on public.assignments;
create policy "Teachers manage own assignments" on public.assignments for all using (teacher_id = (select auth.uid()) and public.teaches_class(class_id)) with check (teacher_id = (select auth.uid()) and public.teaches_class(class_id));
drop policy if exists "Students read class assignments" on public.assignments;
create policy "Students read class assignments" on public.assignments for select using (status = 'published' and public.is_class_member(class_id));

drop policy if exists "Teachers manage assignment questions" on public.assignment_questions;
create policy "Teachers manage assignment questions" on public.assignment_questions for all using (public.can_access_assignment(assignment_id) and public.is_teacher()) with check (public.can_access_assignment(assignment_id) and public.is_teacher());
drop policy if exists "Students read assignment questions" on public.assignment_questions;
create policy "Students read assignment questions" on public.assignment_questions for select using (public.can_access_assignment(assignment_id));

drop policy if exists "Students manage own assignment progress" on public.assignment_question_progress;
create policy "Students manage own assignment progress" on public.assignment_question_progress for all using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id)) with check (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read assignment progress" on public.assignment_question_progress;
create policy "Teachers read assignment progress" on public.assignment_question_progress for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

drop policy if exists "Students manage own submissions" on public.assignment_submissions;
create policy "Students manage own submissions" on public.assignment_submissions for all using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id)) with check (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read assignment submissions" on public.assignment_submissions;
create policy "Teachers read assignment submissions" on public.assignment_submissions for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

create index if not exists question_progress_user_completed_idx on public.question_progress (user_id, completed);
create index if not exists whiteboard_documents_user_updated_idx on public.whiteboard_documents (user_id, updated_at desc);
create index if not exists classes_teacher_idx on public.classes (teacher_id, archived);
create index if not exists class_memberships_student_idx on public.class_memberships (student_id);
create index if not exists assignments_class_idx on public.assignments (class_id, created_at desc);
create index if not exists assignment_progress_assignment_idx on public.assignment_question_progress (assignment_id, student_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email, teacher_status, teacher_requested_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80),
    left(coalesce(new.email, ''), 254),
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then 'pending' else 'none' end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then now() else null end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
