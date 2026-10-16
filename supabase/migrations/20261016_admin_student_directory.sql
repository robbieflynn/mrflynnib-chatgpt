drop function if exists public.admin_student_accounts();
create function public.admin_student_accounts()
returns table (
  user_id uuid,
  display_name text,
  email text,
  curriculum text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  class_count bigint,
  completed_question_count bigint,
  submitted_assignment_count bigint
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
    u.email_confirmed_at,
    u.last_sign_in_at,
    p.created_at,
    (select count(*) from public.class_memberships cm where cm.student_id = p.user_id),
    (select count(*) from public.question_progress qp where qp.user_id = p.user_id and qp.completed),
    (select count(*) from public.assignment_submissions submissions where submissions.student_id = p.user_id and submissions.status = 'submitted')
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.is_admin()
    and p.role = 'student'
  order by p.created_at desc
$$;

revoke all on function public.admin_student_accounts() from public;
revoke execute on function public.admin_student_accounts() from anon;
grant execute on function public.admin_student_accounts() to authenticated;
