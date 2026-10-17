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
  curriculum text not null default 'ib' check (curriculum in ('ib', 'igcse')),
  teacher_status text not null default 'none' check (teacher_status in ('none', 'pending', 'approved', 'rejected')),
  teacher_requested_at timestamptz,
  teacher_notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists curriculum text not null default 'ib';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists teacher_status text not null default 'none';
alter table public.profiles add column if not exists teacher_requested_at timestamptz;
alter table public.profiles add column if not exists teacher_notification_sent_at timestamptz;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));
alter table public.profiles drop constraint if exists profiles_curriculum_check;
alter table public.profiles add constraint profiles_curriculum_check check (curriculum in ('ib', 'igcse'));
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
  show_mark_scheme boolean not null default true,
  feedback_mode text not null default 'after_question' check (feedback_mode in ('immediate', 'after_question', 'after_assignment', 'hidden')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_tests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  course text not null check (course in ('AA HL', 'AA SL', 'AI HL', 'AI SL', 'IGCSE Higher')),
  paper text not null check (paper in ('Paper 1', 'Paper 2', 'Paper 1 and Paper 2')),
  question_count integer not null check (question_count between 1 and 50),
  total_marks integer not null check (total_marks between 1 and 1000),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments add column if not exists show_mark_scheme boolean not null default true;
alter table public.assignments add column if not exists feedback_mode text not null default 'after_question';
alter table public.assignments drop constraint if exists assignments_feedback_mode_check;
alter table public.assignments add constraint assignments_feedback_mode_check check (feedback_mode in ('immediate', 'after_question', 'after_assignment', 'hidden'));

create table if not exists public.assignment_questions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  bank text not null check (bank in ('ib', 'igcse')),
  position integer not null check (position >= 0),
  title_snapshot text not null default '',
  topic_snapshot text not null default '',
  response_type text not null default 'teacher_review' check (response_type in ('teacher_review', 'exact', 'numeric', 'multiple_choice', 'multipart')),
  response_options jsonb not null default '[]'::jsonb,
  primary key (assignment_id, question_id)
);

alter table public.assignment_questions add column if not exists response_type text not null default 'teacher_review';
alter table public.assignment_questions add column if not exists response_options jsonb not null default '[]'::jsonb;
alter table public.assignment_questions drop constraint if exists assignment_questions_response_type_check;
alter table public.assignment_questions add constraint assignment_questions_response_type_check check (response_type in ('teacher_review', 'exact', 'numeric', 'multiple_choice', 'multipart'));

create table if not exists public.assignment_answer_keys (
  assignment_id uuid not null,
  question_id text not null,
  accepted_answers jsonb not null default '[]'::jsonb,
  numeric_answer numeric,
  numeric_tolerance numeric check (numeric_tolerance is null or numeric_tolerance >= 0),
  correct_option integer check (correct_option is null or correct_option >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (assignment_id, question_id),
  foreign key (assignment_id, question_id) references public.assignment_questions(assignment_id, question_id) on delete cascade
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

create table if not exists public.assignment_responses (
  assignment_id uuid not null,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean,
  attempt_count integer not null default 0 check (attempt_count between 0 and 2),
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, student_id, question_id),
  foreign key (assignment_id, question_id) references public.assignment_questions(assignment_id, question_id) on delete cascade
);

create table if not exists public.assignment_whiteboard_snapshots (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  bank text not null check (bank in ('ib', 'igcse')),
  document jsonb not null,
  document_version integer not null default 1,
  saved_at timestamptz not null default now(),
  primary key (assignment_id, student_id, question_id),
  foreign key (assignment_id, question_id) references public.assignment_questions(assignment_id, question_id) on delete cascade
);

alter table public.profiles enable row level security;
alter table public.question_progress enable row level security;
alter table public.whiteboard_documents enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.assignments enable row level security;
alter table public.saved_tests enable row level security;
alter table public.assignment_questions enable row level security;
alter table public.assignment_answer_keys enable row level security;
alter table public.assignment_question_progress enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_responses enable row level security;
alter table public.assignment_whiteboard_snapshots enable row level security;
alter table public.assignment_responses add column if not exists attempt_count integer not null default 0 check (attempt_count between 0 and 2);

create or replace function public.is_teacher(account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = account_id and role in ('teacher', 'admin')) $$;

create or replace function public.is_admin(account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = account_id and role = 'admin') $$;

create or replace function public.profile_curriculum(account_id uuid default auth.uid())
returns text language sql stable security definer set search_path = ''
as $$ select curriculum from public.profiles where user_id = account_id $$;

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

create or replace function public.class_invitation_curriculum(raw_code text)
returns text language sql stable security definer set search_path = ''
as $$
  select bank from public.classes
  where join_code = upper(trim(raw_code)) and not archived
  limit 1
$$;
grant execute on function public.class_invitation_curriculum(text) to anon, authenticated;

create or replace function public.mark_teacher_notification_sent()
returns void language sql security definer set search_path = ''
as $$
  update public.profiles set teacher_notification_sent_at = now(), updated_at = now()
  where user_id = auth.uid()
    and teacher_status in ('pending', 'approved')
    and teacher_notification_sent_at is null
$$;
grant execute on function public.mark_teacher_notification_sent() to authenticated;

-- Ziina checkout records are written only by trusted server-side code. Signed-in
-- customers can read their own order and entitlement status through RLS.
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

drop function if exists public.admin_teacher_accounts();
create function public.admin_teacher_accounts()
returns table (
  user_id uuid,
  display_name text,
  email text,
  curriculum text,
  role text,
  teacher_status text,
  teacher_requested_at timestamptz,
  teacher_notification_sent_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  class_count bigint,
  assignment_count bigint,
  saved_test_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.user_id,
    p.display_name,
    coalesce(nullif(p.email, ''), u.email, ''),
    p.curriculum,
    p.role,
    p.teacher_status,
    p.teacher_requested_at,
    p.teacher_notification_sent_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.created_at,
    (select count(*) from public.classes c where c.teacher_id = p.user_id),
    (select count(*) from public.assignments a where a.teacher_id = p.user_id),
    (select count(*) from public.saved_tests s where s.teacher_id = p.user_id)
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.is_admin()
    and (p.teacher_status <> 'none' or p.role in ('teacher', 'admin'))
  order by p.teacher_requested_at desc nulls last, p.created_at desc
$$;
revoke all on function public.admin_teacher_accounts() from public;
grant execute on function public.admin_teacher_accounts() to authenticated;

create or replace function public.request_teacher_access()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_role text;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request teacher access.';
  end if;

  select role, teacher_status
  into account_role, request_status
  from public.profiles
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Your account profile could not be found.';
  end if;

  if account_role in ('teacher', 'admin') then
    return 'approved';
  end if;

  if request_status = 'pending' then
    return 'pending';
  end if;

  update public.profiles
  set teacher_status = 'pending',
      teacher_requested_at = now(),
      teacher_notification_sent_at = null,
      updated_at = now()
  where user_id = auth.uid()
    and role = 'student';

  return 'pending';
end;
$$;

revoke all on function public.request_teacher_access() from public;
revoke execute on function public.request_teacher_access() from anon;
grant execute on function public.request_teacher_access() to authenticated;

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
create policy "Students read own progress" on public.question_progress for select
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students insert own progress" on public.question_progress;
create policy "Students insert own progress" on public.question_progress for insert
  with check ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students update own progress" on public.question_progress;
create policy "Students update own progress" on public.question_progress for update
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()))
  with check ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students delete own progress" on public.question_progress;
create policy "Students delete own progress" on public.question_progress for delete
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));

drop policy if exists "Students read own whiteboards" on public.whiteboard_documents;
create policy "Students read own whiteboards" on public.whiteboard_documents for select
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students insert own whiteboards" on public.whiteboard_documents;
create policy "Students insert own whiteboards" on public.whiteboard_documents for insert
  with check ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students update own whiteboards" on public.whiteboard_documents;
create policy "Students update own whiteboards" on public.whiteboard_documents for update
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()))
  with check ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));
drop policy if exists "Students delete own whiteboards" on public.whiteboard_documents;
create policy "Students delete own whiteboards" on public.whiteboard_documents for delete
  using ((select auth.uid()) = user_id and (bank = public.profile_curriculum() or public.is_admin()));

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
drop policy if exists "Teachers manage own saved tests" on public.saved_tests;
create policy "Teachers manage own saved tests" on public.saved_tests for all using (teacher_id = (select auth.uid()) and public.is_teacher()) with check (teacher_id = (select auth.uid()) and public.is_teacher());
drop policy if exists "Students read class assignments" on public.assignments;
create policy "Students read class assignments" on public.assignments for select using (status = 'published' and public.is_class_member(class_id));

drop policy if exists "Teachers manage assignment questions" on public.assignment_questions;
create policy "Teachers manage assignment questions" on public.assignment_questions for all using (public.can_access_assignment(assignment_id) and public.is_teacher()) with check (public.can_access_assignment(assignment_id) and public.is_teacher());
drop policy if exists "Students read assignment questions" on public.assignment_questions;
create policy "Students read assignment questions" on public.assignment_questions for select using (public.can_access_assignment(assignment_id));

drop policy if exists "Teachers manage assignment answer keys" on public.assignment_answer_keys;
create policy "Teachers manage assignment answer keys" on public.assignment_answer_keys for all using (public.can_access_assignment(assignment_id) and public.is_teacher()) with check (public.can_access_assignment(assignment_id) and public.is_teacher());

drop policy if exists "Students manage own assignment progress" on public.assignment_question_progress;
create policy "Students manage own assignment progress" on public.assignment_question_progress for all using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id)) with check (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read assignment progress" on public.assignment_question_progress;
create policy "Teachers read assignment progress" on public.assignment_question_progress for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

drop policy if exists "Students manage own submissions" on public.assignment_submissions;
create policy "Students manage own submissions" on public.assignment_submissions for all using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id)) with check (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read assignment submissions" on public.assignment_submissions;
create policy "Teachers read assignment submissions" on public.assignment_submissions for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

drop policy if exists "Students read own assignment responses" on public.assignment_responses;
create policy "Students read own assignment responses" on public.assignment_responses for select using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read assignment responses" on public.assignment_responses;
create policy "Teachers read assignment responses" on public.assignment_responses for select using (public.can_access_assignment(assignment_id) and public.is_teacher());

create index if not exists question_progress_user_completed_idx on public.question_progress (user_id, completed);
create index if not exists whiteboard_documents_user_updated_idx on public.whiteboard_documents (user_id, updated_at desc);
create index if not exists classes_teacher_idx on public.classes (teacher_id, archived);
create index if not exists class_memberships_student_idx on public.class_memberships (student_id);
create index if not exists assignments_class_idx on public.assignments (class_id, created_at desc);
create index if not exists saved_tests_teacher_updated_idx on public.saved_tests (teacher_id, updated_at desc);
create index if not exists assignment_progress_assignment_idx on public.assignment_question_progress (assignment_id, student_id);
create index if not exists assignment_responses_assignment_idx on public.assignment_responses (assignment_id, student_id);

create or replace function public.submit_assignment_response(assignment_uuid uuid, question_key text, response_payload jsonb)
returns table (is_correct boolean, result text)
language plpgsql security definer set search_path = ''
as $$
declare
  response_kind text;
  answer_options jsonb;
  accepted jsonb;
  expected_number numeric;
  allowed_tolerance numeric;
  expected_option integer;
  submitted_text text;
  submitted_number numeric;
  submitted_option integer;
  grade_result boolean;
  result_label text;
  existing_attempts integer := 0;
  attempts_after integer := 0;
  has_part_answers boolean := false;
  submitted_parts jsonb;
  part_key text;
  part_config jsonb;
  part_answer text;
  part_matches boolean;
  has_review_parts boolean := false;
  has_incorrect_parts boolean := false;
  requested_part text;
  existing_response jsonb := '{}'::jsonb;
  saved_parts jsonb := '{}'::jsonb;
  part_states jsonb := '{}'::jsonb;
  prior_part_result text;
  part_attempts integer := 0;
  part_result text;
  all_parts_complete boolean := false;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Student answers can only be submitted from a student account.'; end if;
  if not public.can_access_assignment(assignment_uuid, auth.uid()) then raise exception 'Assignment not found.'; end if;
  if response_payload is null or length(response_payload::text) > 4000 then raise exception 'Answer is too long.'; end if;
  select aq.response_type, aq.response_options, ak.accepted_answers, ak.numeric_answer, ak.numeric_tolerance, ak.correct_option
    into response_kind, answer_options, accepted, expected_number, allowed_tolerance, expected_option
  from public.assignment_questions aq
  left join public.assignment_answer_keys ak on ak.assignment_id = aq.assignment_id and ak.question_id = aq.question_id
  where aq.assignment_id = assignment_uuid and aq.question_id = left(question_key, 160);
  if response_kind is null then raise exception 'Question not found.'; end if;
  select coalesce(ar.attempt_count, 0), coalesce(ar.response, '{}'::jsonb)
    into existing_attempts, existing_response
  from public.assignment_responses ar where ar.assignment_id = assignment_uuid and ar.student_id = auth.uid() and ar.question_id = left(question_key, 160);
  existing_attempts := coalesce(existing_attempts, 0);
  existing_response := coalesce(existing_response, '{}'::jsonb);
  requested_part := left(trim(coalesce(response_payload ->> 'partKey', '')), 30);
  if response_kind <> 'teacher_review' and not (response_kind = 'multipart' and requested_part <> '') and existing_attempts >= 2 then return query select false, 'locked'::text; return; end if;
  submitted_text := left(trim(coalesce(response_payload ->> 'text', '')), 500);
  has_part_answers := coalesce(
    jsonb_typeof(response_payload -> 'parts') = 'object'
      and response_payload -> 'parts' <> '{}'::jsonb,
    false
  );
  if response_kind = 'multiple_choice' then
    if not (response_payload ? 'option') then raise exception 'Choose an answer.'; end if;
    submitted_option := (response_payload ->> 'option')::integer;
    if submitted_option is null or submitted_option < 0 or submitted_option >= jsonb_array_length(answer_options) then raise exception 'Choose a valid answer.'; end if;
    grade_result := case when expected_option is null then null else submitted_option = expected_option end;
  elsif response_kind = 'numeric' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    begin submitted_number := replace(replace(submitted_text, ',', ''), ' ', '')::numeric;
    exception when invalid_text_representation then submitted_number := null; end;
    grade_result := case when expected_number is null then null when submitted_number is null then false else abs(submitted_number - expected_number) <= coalesce(allowed_tolerance, 0) end;
  elsif response_kind = 'exact' then
    if submitted_text = '' then raise exception 'Enter an answer.'; end if;
    if accepted is null or jsonb_array_length(accepted) = 0 then grade_result := null;
    else select exists (select 1 from jsonb_array_elements_text(accepted) item where lower(regexp_replace(trim(item), '\s+', '', 'g')) = lower(regexp_replace(submitted_text, '\s+', '', 'g'))) into grade_result; end if;
  elsif response_kind = 'multipart' and requested_part <> '' then
    if jsonb_typeof(accepted) <> 'object' or not (accepted ? requested_part) then raise exception 'That question part was not found.'; end if;
    part_config := accepted -> requested_part;
    saved_parts := case when jsonb_typeof(existing_response -> 'parts') = 'object' then existing_response -> 'parts' else '{}'::jsonb end;
    part_states := case when jsonb_typeof(existing_response -> '_partStates') = 'object' then existing_response -> '_partStates' else '{}'::jsonb end;
    prior_part_result := part_states -> requested_part ->> 'result';
    if prior_part_result in ('correct', 'incorrect_final', 'saved') then
      return query select case when prior_part_result = 'correct' then true when prior_part_result = 'incorrect_final' then false else null end, 'locked'::text;
      return;
    end if;
    part_answer := left(trim(coalesce(response_payload ->> 'partAnswer', '')), 500);
    if part_config ->> 'mode' = 'whiteboard' then
      if part_answer <> '__whiteboard__' then raise exception 'Confirm that this part is on the whiteboard or paper.'; end if;
      part_matches := null;
      part_result := 'saved';
      part_attempts := 0;
    else
      if part_answer = '' then raise exception 'Choose or enter an answer for this part.'; end if;
      select exists (
        select 1 from jsonb_array_elements_text(part_config -> 'answers') item
        where lower(regexp_replace(trim(item), '\s+', '', 'g')) = lower(regexp_replace(part_answer, '\s+', '', 'g'))
      ) into part_matches;
      part_attempts := least(coalesce((part_states -> requested_part ->> 'attemptCount')::integer, 0) + 1, 2);
      part_result := case when part_matches then 'correct' when part_attempts < 2 then 'retry' else 'incorrect_final' end;
    end if;
    saved_parts := jsonb_set(saved_parts, array[requested_part], to_jsonb(part_answer), true);
    part_states := jsonb_set(part_states, array[requested_part], jsonb_build_object(
      'result', part_result,
      'isCorrect', part_matches,
      'attemptCount', part_attempts
    ), true);
    existing_response := existing_response || jsonb_build_object('parts', saved_parts, '_partStates', part_states);
    all_parts_complete := true;
    has_review_parts := false;
    has_incorrect_parts := false;
    for part_key, part_config in select key, value from jsonb_each(accepted)
    loop
      part_result := part_states -> part_key ->> 'result';
      if coalesce(part_result, '') not in ('correct', 'incorrect_final', 'saved') then all_parts_complete := false; end if;
      if part_result = 'saved' then has_review_parts := true; end if;
      if part_result = 'incorrect_final' then has_incorrect_parts := true; end if;
    end loop;
    select coalesce(max(coalesce((value ->> 'attemptCount')::integer, 0)), 0) into attempts_after from jsonb_each(part_states);
    grade_result := case when not all_parts_complete then null when has_incorrect_parts then false when has_review_parts then null else true end;
    insert into public.assignment_responses (assignment_id, student_id, question_id, response, is_correct, attempt_count, checked_at, updated_at)
    values (assignment_uuid, auth.uid(), left(question_key, 160), existing_response, grade_result, attempts_after, case when all_parts_complete then now() else null end, now())
    on conflict (assignment_id, student_id, question_id) do update set response = excluded.response, is_correct = excluded.is_correct, attempt_count = excluded.attempt_count, checked_at = excluded.checked_at, updated_at = now();
    insert into public.assignment_question_progress (assignment_id, student_id, question_id, completed, completed_at, updated_at)
    values (assignment_uuid, auth.uid(), left(question_key, 160), all_parts_complete, case when all_parts_complete then now() else null end, now())
    on conflict (assignment_id, student_id, question_id) do update set completed = excluded.completed, completed_at = case when excluded.completed then coalesce(public.assignment_question_progress.completed_at, now()) else null end, updated_at = now();
    insert into public.assignment_submissions (assignment_id, student_id, status, submitted_at, updated_at)
    values (assignment_uuid, auth.uid(), 'in_progress', null, now())
    on conflict (assignment_id, student_id) do update set status = 'in_progress', submitted_at = null, updated_at = now();
    return query select part_matches, case when prior_part_result in ('correct', 'incorrect_final', 'saved') then 'locked' else part_states -> requested_part ->> 'result' end;
    return;
  elsif response_kind = 'multipart' then
    submitted_parts := response_payload -> 'parts';
    if jsonb_typeof(submitted_parts) <> 'object' or jsonb_typeof(accepted) <> 'object' then raise exception 'Complete every part.'; end if;
    for part_key, part_config in select key, value from jsonb_each(accepted)
    loop
      part_answer := left(trim(coalesce(submitted_parts ->> part_key, '')), 500);
      if part_config ->> 'mode' = 'whiteboard' then
        if part_answer <> '__whiteboard__' then raise exception 'Confirm every part shown on the whiteboard.'; end if;
        has_review_parts := true;
      else
        if part_answer = '' then raise exception 'Complete every part.'; end if;
        select exists (
          select 1 from jsonb_array_elements_text(part_config -> 'answers') item
          where lower(regexp_replace(trim(item), '\s+', '', 'g')) = lower(regexp_replace(part_answer, '\s+', '', 'g'))
        ) into part_matches;
        if not part_matches then has_incorrect_parts := true; end if;
      end if;
    end loop;
    grade_result := case when has_incorrect_parts then false when has_review_parts then null else true end;
  else
    if submitted_text = '' and not has_part_answers then raise exception 'Enter an answer.'; end if;
    grade_result := null;
  end if;
  attempts_after := case when response_kind = 'teacher_review' or grade_result is null then existing_attempts else least(existing_attempts + 1, 2) end;
  insert into public.assignment_responses (assignment_id, student_id, question_id, response, is_correct, attempt_count, checked_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), response_payload, grade_result, attempts_after, case when grade_result is null then null else now() end, now())
  on conflict (assignment_id, student_id, question_id) do update set response = excluded.response, is_correct = excluded.is_correct, attempt_count = excluded.attempt_count, checked_at = excluded.checked_at, updated_at = now();
  insert into public.assignment_question_progress (assignment_id, student_id, question_id, completed, completed_at, updated_at)
  values (assignment_uuid, auth.uid(), left(question_key, 160), true, now(), now())
  on conflict (assignment_id, student_id, question_id) do update set completed = true, completed_at = coalesce(public.assignment_question_progress.completed_at, now()), updated_at = now();
  insert into public.assignment_submissions (assignment_id, student_id, status, submitted_at, updated_at)
  values (assignment_uuid, auth.uid(), 'in_progress', null, now())
  on conflict (assignment_id, student_id) do update set status = 'in_progress', submitted_at = null, updated_at = now();
  result_label := case when grade_result is true then 'correct' when grade_result is false and attempts_after < 2 then 'retry' when grade_result is false then 'incorrect_final' else 'saved' end;
  return query select grade_result, result_label;
end;
$$;
grant execute on function public.submit_assignment_response(uuid, text, jsonb) to authenticated;

create or replace function public.submit_assignment_part_response(assignment_uuid uuid, question_key text, part_key text, part_answer text)
returns table (is_correct boolean, result text)
language sql security definer set search_path = ''
as $$
  select * from public.submit_assignment_response(
    assignment_uuid,
    question_key,
    jsonb_build_object('partKey', part_key, 'partAnswer', part_answer)
  )
$$;
grant execute on function public.submit_assignment_part_response(uuid, text, text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email, curriculum, teacher_status, teacher_requested_at)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')),
      ''
    ), 80),
    left(coalesce(new.email, ''), 254),
    case when new.raw_user_meta_data ->> 'curriculum' = 'igcse' then 'igcse' else 'ib' end,
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
