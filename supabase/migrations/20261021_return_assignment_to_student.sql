-- Allow the owning teacher to return a final submission without deleting the
-- student's answers, progress, or editable whiteboard document.

create or replace function public.prevent_submission_reopening()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.status = 'submitted' and (
    new.status <> 'submitted' or new.submitted_at is distinct from old.submitted_at
  ) and not (
    new.status = 'in_progress'
    and new.submitted_at is null
    and auth.uid() is not null
    and exists (
      select 1
      from public.assignments assignment
      where assignment.id = new.assignment_id
        and assignment.teacher_id = auth.uid()
    )
  ) then
    raise exception 'A submitted assignment can only be returned by its teacher.';
  end if;
  return new;
end;
$$;

create or replace function public.return_assignment_to_student(
  assignment_uuid uuid,
  student_uuid uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  returned_at timestamptz := now();
  target_class_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must sign in first.';
  end if;
  if not public.is_teacher(auth.uid()) then
    raise exception 'Only a teacher can return an assignment.';
  end if;

  select assignment.class_id
  into target_class_id
  from public.assignments assignment
  where assignment.id = assignment_uuid
    and assignment.teacher_id = auth.uid();

  if target_class_id is null then
    raise exception 'Assignment not found.';
  end if;
  if not exists (
    select 1
    from public.class_memberships membership
    where membership.class_id = target_class_id
      and membership.student_id = student_uuid
  ) then
    raise exception 'Student not found in this class.';
  end if;
  if not exists (
    select 1
    from public.assignment_submissions submission
    where submission.assignment_id = assignment_uuid
      and submission.student_id = student_uuid
      and submission.status = 'submitted'
  ) then
    raise exception 'This assignment is not currently submitted.';
  end if;

  -- Remove only the immutable hand-in copy. The student's editable whiteboard
  -- and every saved answer remain untouched. A fresh copy is taken on resubmit.
  delete from public.assignment_whiteboard_snapshots snapshot
  where snapshot.assignment_id = assignment_uuid
    and snapshot.student_id = student_uuid;

  update public.assignment_submissions submission
  set status = 'in_progress',
      submitted_at = null,
      updated_at = returned_at
  where submission.assignment_id = assignment_uuid
    and submission.student_id = student_uuid
    and submission.status = 'submitted';

  return returned_at;
end;
$$;

revoke all on function public.return_assignment_to_student(uuid, uuid) from public;
grant execute on function public.return_assignment_to_student(uuid, uuid) to authenticated;
