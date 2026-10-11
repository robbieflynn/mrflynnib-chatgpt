-- Final submissions, curriculum boundaries, and immutable submitted whiteboards.

alter table public.profiles
  add column if not exists curriculum text not null default 'ib';
alter table public.profiles drop constraint if exists profiles_curriculum_check;
alter table public.profiles
  add constraint profiles_curriculum_check check (curriculum in ('ib', 'igcse'));

-- Preserve existing accounts. Only accounts with exclusively IGCSE activity move
-- automatically; mixed accounts remain IB so the main-site identity is not changed.
with activity as (
  select p.user_id,
    exists (select 1 from public.classes c where c.teacher_id = p.user_id and c.bank = 'igcse')
      or exists (select 1 from public.class_memberships cm join public.classes c on c.id = cm.class_id where cm.student_id = p.user_id and c.bank = 'igcse')
      or exists (select 1 from public.question_progress qp where qp.user_id = p.user_id and qp.bank = 'igcse')
      or exists (select 1 from public.whiteboard_documents wd where wd.user_id = p.user_id and wd.bank = 'igcse') as has_igcse,
    exists (select 1 from public.classes c where c.teacher_id = p.user_id and c.bank = 'ib')
      or exists (select 1 from public.class_memberships cm join public.classes c on c.id = cm.class_id where cm.student_id = p.user_id and c.bank = 'ib')
      or exists (select 1 from public.question_progress qp where qp.user_id = p.user_id and qp.bank = 'ib')
      or exists (select 1 from public.whiteboard_documents wd where wd.user_id = p.user_id and wd.bank = 'ib') as has_ib
  from public.profiles p
)
update public.profiles p set curriculum = 'igcse', updated_at = now()
from activity a
where p.user_id = a.user_id and a.has_igcse and not a.has_ib and p.role <> 'admin';

create or replace function public.profile_curriculum(account_id uuid default auth.uid())
returns text language sql stable security definer set search_path = ''
as $$ select curriculum from public.profiles where user_id = account_id $$;

create or replace function public.teaches_class(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes c
    join public.profiles p on p.user_id = account_id
    where c.id = class_uuid and c.teacher_id = account_id
      and (p.role = 'admin' or c.bank = p.curriculum)
  )
$$;

create or replace function public.is_class_member(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_memberships cm
    join public.classes c on c.id = cm.class_id
    join public.profiles p on p.user_id = account_id
    where cm.class_id = class_uuid and cm.student_id = account_id
      and c.bank = p.curriculum
  )
$$;

create or replace function public.can_access_assignment(assignment_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = assignment_uuid
      and (
        (a.teacher_id = account_id and public.teaches_class(a.class_id, account_id))
        or (a.status = 'published' and public.is_class_member(a.class_id, account_id))
      )
  )
$$;

create or replace function public.join_class_by_code(raw_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare selected_class uuid; selected_bank text; account_bank text;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  select id, bank into selected_class, selected_bank
    from public.classes where join_code = upper(trim(raw_code)) and not archived;
  if selected_class is null then raise exception 'That class code was not found.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Teacher accounts cannot join student classes.'; end if;
  account_bank := public.profile_curriculum(auth.uid());
  if account_bank is distinct from selected_bank then
    raise exception 'This invitation belongs to a different account area. Sign in through the correct IB or IGCSE account page.';
  end if;
  insert into public.class_memberships (class_id, student_id)
    values (selected_class, auth.uid()) on conflict do nothing;
  return selected_class;
end;
$$;

create or replace function public.class_invitation_curriculum(raw_code text)
returns text language sql stable security definer set search_path = ''
as $$
  select bank from public.classes
  where join_code = upper(trim(raw_code)) and not archived
  limit 1
$$;
grant execute on function public.class_invitation_curriculum(text) to anon, authenticated;

drop policy if exists "Teachers manage own classes" on public.classes;
create policy "Teachers manage own classes" on public.classes for all
  using (
    teacher_id = (select auth.uid()) and public.is_teacher()
    and (public.is_admin() or bank = public.profile_curriculum())
  )
  with check (
    teacher_id = (select auth.uid()) and public.is_teacher()
    and (public.is_admin() or bank = public.profile_curriculum())
  );

drop policy if exists "Students read own progress" on public.question_progress;
create policy "Students read own progress" on public.question_progress for select
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students insert own progress" on public.question_progress;
create policy "Students insert own progress" on public.question_progress for insert
  with check ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students update own progress" on public.question_progress;
create policy "Students update own progress" on public.question_progress for update
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum())
  with check ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students delete own progress" on public.question_progress;
create policy "Students delete own progress" on public.question_progress for delete
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum());

drop policy if exists "Students read own whiteboards" on public.whiteboard_documents;
create policy "Students read own whiteboards" on public.whiteboard_documents for select
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students insert own whiteboards" on public.whiteboard_documents;
create policy "Students insert own whiteboards" on public.whiteboard_documents for insert
  with check ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students update own whiteboards" on public.whiteboard_documents;
create policy "Students update own whiteboards" on public.whiteboard_documents for update
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum())
  with check ((select auth.uid()) = user_id and bank = public.profile_curriculum());
drop policy if exists "Students delete own whiteboards" on public.whiteboard_documents;
create policy "Students delete own whiteboards" on public.whiteboard_documents for delete
  using ((select auth.uid()) = user_id and bank = public.profile_curriculum());

drop policy if exists "Teachers read assigned whiteboards" on public.whiteboard_documents;
create policy "Teachers read assigned whiteboards" on public.whiteboard_documents for select using (
  exists (
    select 1 from public.assignment_questions aq
    join public.assignments a on a.id = aq.assignment_id
    where aq.bank = whiteboard_documents.bank
      and aq.question_id = whiteboard_documents.question_id
      and public.teaches_class(a.class_id)
      and public.is_class_member(a.class_id, whiteboard_documents.user_id)
  )
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
  foreign key (assignment_id, question_id)
    references public.assignment_questions(assignment_id, question_id) on delete cascade
);
alter table public.assignment_whiteboard_snapshots enable row level security;
create index if not exists assignment_whiteboard_snapshots_review_idx
  on public.assignment_whiteboard_snapshots (assignment_id, student_id);

drop policy if exists "Students read submitted whiteboard snapshots" on public.assignment_whiteboard_snapshots;
create policy "Students read submitted whiteboard snapshots" on public.assignment_whiteboard_snapshots for select
  using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Teachers read submitted whiteboard snapshots" on public.assignment_whiteboard_snapshots;
create policy "Teachers read submitted whiteboard snapshots" on public.assignment_whiteboard_snapshots for select
  using (public.can_access_assignment(assignment_id) and public.is_teacher());

-- Preserve the best available copy for assignments submitted before this release.
insert into public.assignment_whiteboard_snapshots
  (assignment_id, student_id, question_id, bank, document, document_version, saved_at)
select s.assignment_id, s.student_id, aq.question_id, aq.bank,
  wd.document, wd.document_version, coalesce(s.submitted_at, s.updated_at, wd.updated_at)
from public.assignment_submissions s
join public.assignment_questions aq on aq.assignment_id = s.assignment_id
join public.whiteboard_documents wd
  on wd.user_id = s.student_id and wd.bank = aq.bank and wd.question_id = aq.question_id
where s.status = 'submitted'
on conflict do nothing;

create or replace function public.prevent_submitted_assignment_changes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.assignment_submissions s
    where s.assignment_id = new.assignment_id and s.student_id = new.student_id
      and s.status = 'submitted'
  ) then raise exception 'This assignment has already been submitted.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_submitted_response_changes on public.assignment_responses;
create trigger prevent_submitted_response_changes before insert or update on public.assignment_responses
  for each row execute function public.prevent_submitted_assignment_changes();
drop trigger if exists prevent_submitted_progress_changes on public.assignment_question_progress;
create trigger prevent_submitted_progress_changes before insert or update on public.assignment_question_progress
  for each row execute function public.prevent_submitted_assignment_changes();

create or replace function public.prevent_submission_reopening()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status = 'submitted' and (
    new.status <> 'submitted' or new.submitted_at is distinct from old.submitted_at
  ) then raise exception 'A submitted assignment cannot be reopened or resubmitted.';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_submission_reopening on public.assignment_submissions;
create trigger prevent_submission_reopening before update on public.assignment_submissions
  for each row execute function public.prevent_submission_reopening();

drop policy if exists "Students manage own submissions" on public.assignment_submissions;
drop policy if exists "Students read own submissions" on public.assignment_submissions;
create policy "Students read own submissions" on public.assignment_submissions for select
  using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
drop policy if exists "Students start own submissions" on public.assignment_submissions;
create policy "Students start own submissions" on public.assignment_submissions for insert
  with check (student_id = (select auth.uid()) and status = 'in_progress' and submitted_at is null and public.can_access_assignment(assignment_id));
drop policy if exists "Students update active submissions" on public.assignment_submissions;
create policy "Students update active submissions" on public.assignment_submissions for update
  using (student_id = (select auth.uid()) and status = 'in_progress' and public.can_access_assignment(assignment_id))
  with check (student_id = (select auth.uid()) and status = 'in_progress' and submitted_at is null and public.can_access_assignment(assignment_id));

create or replace function public.finalize_assignment_submission(assignment_uuid uuid)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare final_time timestamptz; assignment_bank text;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Only a student can submit this assignment.'; end if;
  if not public.can_access_assignment(assignment_uuid, auth.uid()) then raise exception 'Assignment not found.'; end if;
  select submitted_at into final_time from public.assignment_submissions
    where assignment_id = assignment_uuid and student_id = auth.uid() and status = 'submitted';
  if final_time is not null then return final_time; end if;

  insert into public.assignment_whiteboard_snapshots
    (assignment_id, student_id, question_id, bank, document, document_version, saved_at)
  select aq.assignment_id, auth.uid(), aq.question_id, aq.bank,
    wd.document, wd.document_version, now()
  from public.assignment_questions aq
  join public.whiteboard_documents wd
    on wd.user_id = auth.uid() and wd.bank = aq.bank and wd.question_id = aq.question_id
  where aq.assignment_id = assignment_uuid
  on conflict (assignment_id, student_id, question_id) do nothing;

  final_time := now();
  insert into public.assignment_submissions
    (assignment_id, student_id, status, submitted_at, updated_at)
  values (assignment_uuid, auth.uid(), 'submitted', final_time, final_time)
  on conflict (assignment_id, student_id) do update
    set status = 'submitted', submitted_at = final_time, updated_at = final_time
    where public.assignment_submissions.status = 'in_progress';
  return final_time;
end;
$$;
grant execute on function public.finalize_assignment_submission(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles
    (user_id, display_name, email, curriculum, teacher_status, teacher_requested_at)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')), ''), 80),
    left(coalesce(new.email, ''), 254),
    case when new.raw_user_meta_data ->> 'curriculum' = 'igcse' then 'igcse' else 'ib' end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then 'pending' else 'none' end,
    case when new.raw_user_meta_data ->> 'account_type' = 'teacher' then now() else null end
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;
