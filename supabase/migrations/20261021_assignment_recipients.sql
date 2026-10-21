-- Whole-class and selected-student assignment audiences.

create table if not exists public.assignment_recipients (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table public.assignment_recipients enable row level security;

create index if not exists assignment_recipients_student_idx
  on public.assignment_recipients (student_id, assignment_id);

drop policy if exists "Teachers manage assignment recipients" on public.assignment_recipients;
create policy "Teachers manage assignment recipients" on public.assignment_recipients for all
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_recipients.assignment_id
        and a.teacher_id = (select auth.uid())
        and public.teaches_class(a.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_recipients.assignment_id
        and a.teacher_id = (select auth.uid())
        and public.teaches_class(a.class_id)
    )
  );

drop policy if exists "Students read own assignment recipients" on public.assignment_recipients;
create policy "Students read own assignment recipients" on public.assignment_recipients for select
  using (student_id = (select auth.uid()));

create or replace function public.is_assignment_recipient(assignment_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select
    not exists (select 1 from public.assignment_recipients ar where ar.assignment_id = assignment_uuid)
    or exists (select 1 from public.assignment_recipients ar where ar.assignment_id = assignment_uuid and ar.student_id = account_id)
$$;

create or replace function public.can_access_assignment(assignment_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = assignment_uuid
      and (
        (a.teacher_id = account_id and public.teaches_class(a.class_id, account_id))
        or (
          a.status = 'published'
          and public.is_class_member(a.class_id, account_id)
          and public.is_assignment_recipient(a.id, account_id)
        )
      )
  )
$$;

drop policy if exists "Students read class assignments" on public.assignments;
create policy "Students read class assignments" on public.assignments for select using (
  status = 'published' and public.is_class_member(class_id) and public.is_assignment_recipient(id)
);

drop policy if exists "Teachers read assigned whiteboards" on public.whiteboard_documents;
create policy "Teachers read assigned whiteboards" on public.whiteboard_documents for select using (
  exists (
    select 1 from public.assignment_questions aq
    join public.assignments a on a.id = aq.assignment_id
    where aq.bank = whiteboard_documents.bank
      and aq.question_id = whiteboard_documents.question_id
      and public.teaches_class(a.class_id)
      and public.is_class_member(a.class_id, whiteboard_documents.user_id)
      and public.is_assignment_recipient(a.id, whiteboard_documents.user_id)
  )
);
