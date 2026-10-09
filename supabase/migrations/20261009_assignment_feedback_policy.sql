alter table public.assignments
  add column if not exists feedback_mode text;

update public.assignments
set feedback_mode = case when show_mark_scheme then 'immediate' else 'hidden' end
where feedback_mode is null;

alter table public.assignments
  alter column feedback_mode set default 'after_question',
  alter column feedback_mode set not null;

alter table public.assignments
  drop constraint if exists assignments_feedback_mode_check;

alter table public.assignments
  add constraint assignments_feedback_mode_check
  check (feedback_mode in ('immediate', 'after_question', 'after_assignment', 'hidden'));

comment on column public.assignments.feedback_mode is
  'Controls when students can open the complete mark scheme and worked solution.';
