-- Optional, authored solution steps. Existing assignments remain hints-off.
begin;
alter table public.assignments add column if not exists allow_hints boolean not null default false;
create table public.assignment_hint_usage (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  revealed_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(revealed_steps) = 'array'),
  hint_count integer generated always as (jsonb_array_length(revealed_steps)) stored,
  first_used_at timestamptz,
  last_used_at timestamptz,
  primary key (assignment_id, student_id, question_id),
  foreign key (assignment_id, question_id) references public.assignment_questions(assignment_id, question_id) on delete cascade
);
alter table public.assignment_hint_usage enable row level security;
grant select on public.assignment_hint_usage to authenticated;
revoke insert, update, delete on public.assignment_hint_usage from anon, authenticated;
create policy "Students read own hints" on public.assignment_hint_usage for select to authenticated
  using (student_id = (select auth.uid()) and public.can_access_assignment(assignment_id));
create policy "Teachers read assignment hints" on public.assignment_hint_usage for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid()) and public.teaches_class(a.class_id)));

-- Only the trusted server may supply an authored step. Expected count makes
-- duplicate clicks, concurrent tabs and retries reveal at most one new step.
create function public.reveal_assignment_hint(assignment_uuid uuid, student_uuid uuid, question_key text, expected_count integer, hint_step jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  task public.assignments%rowtype;
  saved jsonb;
begin
  select * into task from public.assignments where id = assignment_uuid for share;
  if not found or task.status <> 'published' or not public.is_class_member(task.class_id, student_uuid)
    or not public.is_assignment_recipient(task.id, student_uuid)
    or not exists (select 1 from public.profiles where user_id = student_uuid and role = 'student')
    or not exists (select 1 from public.assignment_questions where assignment_id = task.id and question_id = question_key)
    then raise exception 'Assignment not available.'; end if;
  if expected_count < 0 or expected_count > 1000 or jsonb_typeof(hint_step) <> 'object' then raise exception 'Invalid hint.'; end if;
  -- Ensure even a first hint and a first submission serialize on the same row.
  insert into public.assignment_submissions (assignment_id, student_id) values (task.id, student_uuid) on conflict do nothing;
  perform 1 from public.assignment_submissions where assignment_id = task.id and student_id = student_uuid for share;
  insert into public.assignment_hint_usage (assignment_id,student_id,question_id) values (task.id,student_uuid,question_key) on conflict do nothing;
  select revealed_steps into saved from public.assignment_hint_usage
    where assignment_id = task.id and student_id = student_uuid and question_id = question_key for update;
  -- Return a previous success even if a submission or setting changed during a retry.
  if jsonb_array_length(saved) > expected_count then return saved; end if;
  if not task.allow_hints then raise exception 'Hints are switched off.'; end if;
  if exists (select 1 from public.assignment_submissions where assignment_id = task.id and student_id = student_uuid and status = 'submitted') then raise exception 'Assignment already submitted.'; end if;
  if jsonb_array_length(saved) <> expected_count then raise exception 'Reload hints and try again.'; end if;
  saved := saved || jsonb_build_array(hint_step);
  update public.assignment_hint_usage set revealed_steps = saved, first_used_at = coalesce(first_used_at, now()), last_used_at = now()
    where assignment_id = task.id and student_id = student_uuid and question_id = question_key;
  return saved;
end;
$$;
revoke all on function public.reveal_assignment_hint(uuid,uuid,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.reveal_assignment_hint(uuid,uuid,text,integer,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
