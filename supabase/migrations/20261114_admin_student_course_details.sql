-- Read only the fields needed by the administrator form, using the signed-in
-- admin's session rather than requiring a service credential in Preview.
create or replace function public.admin_student_course_details(student_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  return (
    select jsonb_build_object(
      'display_name', p.display_name, 'email', coalesce(nullif(p.email,''), u.email),
      'primary_course', coalesce(u.raw_user_meta_data->>'primary_course',''),
      'access', coalesce((select jsonb_agg(jsonb_build_object('product_code', e.product_code, 'expires_at', e.expires_at))
        from public.platform_entitlements e where e.user_id=p.user_id and e.status='active'), '[]'::jsonb)
    ) from public.profiles p join auth.users u on u.id=p.user_id
    where p.user_id=student_id and p.role='student' and p.curriculum='ib'
  );
end;
$$;
revoke all on function public.admin_student_course_details(uuid) from public, anon;
grant execute on function public.admin_student_course_details(uuid) to authenticated;
