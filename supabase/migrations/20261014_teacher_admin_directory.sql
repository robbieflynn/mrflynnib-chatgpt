create or replace function public.mark_teacher_notification_sent()
returns void language sql security definer set search_path = ''
as $$
  update public.profiles set teacher_notification_sent_at = now(), updated_at = now()
  where user_id = auth.uid()
    and teacher_status in ('pending', 'approved')
    and teacher_notification_sent_at is null
$$;
grant execute on function public.mark_teacher_notification_sent() to authenticated;

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
