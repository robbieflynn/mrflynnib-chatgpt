-- Resolve the transfer source from actual access, not only course preference.
create or replace function public.admin_change_student_course(student_id uuid, new_course text, expected_course text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  account_role text;
  account_curriculum text;
  old_course text;
  selected_course text;
  old_product text;
  new_product text;
  existing_courses text[];
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if new_course is null or new_course not in ('aa-hl','aa-sl','ai-hl','ai-sl') then
    raise exception 'invalid_course';
  end if;
  select p.role, p.curriculum into account_role, account_curriculum
    from public.profiles p where p.user_id = student_id for update;
  if account_role is distinct from 'student' or account_curriculum is distinct from 'ib' then
    raise exception 'invalid_student';
  end if;
  select coalesce(u.raw_user_meta_data->>'primary_course', '') into selected_course
    from auth.users u where u.id = student_id for update;
  perform 1 from public.platform_entitlements e where e.user_id = student_id for update;
  select array_agg(distinct replace(substr(e.product_code, 11), '_', '-')) into existing_courses
    from public.platform_entitlements e where e.user_id = student_id
    and e.product_code in ('course_ib_aa_hl','course_ib_aa_sl','course_ib_ai_hl','course_ib_ai_sl')
    and e.status = 'active' and (e.expires_at is null or e.expires_at > now());
  -- A single Plus course is the access being transferred, even when the
  -- student's browsing preference already points at the destination course.
  if cardinality(existing_courses) = 1 then
    old_course := existing_courses[1];
  elsif selected_course in ('aa-hl','aa-sl','ai-hl','ai-sl') then
    old_course := selected_course;
  elsif cardinality(existing_courses) > 1 then
    raise exception 'ambiguous_course';
  else
    old_course := '';
  end if;
  if old_course is distinct from expected_course then raise exception 'course_changed'; end if;
  if old_course = new_course and selected_course = new_course then return; end if;
  old_product := 'course_ib_' || replace(old_course, '-', '_');
  new_product := 'course_ib_' || replace(new_course, '-', '_');

  -- A purchased school seat belongs to a course-specific capacity pool.
  -- Never silently grant an extra seat or rewrite the whole school's licence.
  if exists (
    select 1 from public.organization_license_seats s
    join public.organization_licenses l on l.id = s.license_id
    where s.user_id = student_id and s.revoked_at is null
      and l.product_code = old_product and l.status in ('active','pilot')
      and (l.ends_at is null or l.ends_at > now())
  ) then raise exception 'school_seat'; end if;

  -- Preserve entitlement IDs, payment/refund references, sources and exact dates.
  -- Keep expired/revoked history and unrelated/all-course access unchanged.
  update public.platform_entitlements e set product_code = new_product, updated_at = now()
    where e.user_id = student_id and e.product_code = old_product
      and e.status = 'active' and (e.expires_at is null or e.expires_at > now());

  update auth.users u set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('primary_course', new_course, 'course_preferences', jsonb_build_array(new_course)),
    updated_at = now()
    where u.id = student_id;
  -- The auth trigger also reconciles approved-domain access; repeat explicitly
  -- for installations whose older trigger did not include metadata updates.
  perform public.upsert_school_plus_access(student_id);
  insert into public.course_platform_state(user_id, curriculum, last_course_id, last_lesson_id, updated_at)
    values (student_id, 'ib', new_course, null, now())
    on conflict (user_id, curriculum) do update set last_course_id = excluded.last_course_id,
      last_lesson_id = null, updated_at = now();
  insert into public.student_course_changes(student_id, changed_by, old_course, new_course)
    values (student_id, auth.uid(), nullif(old_course, ''), new_course);
end;
$$;
revoke all on function public.admin_change_student_course(uuid,text,text) from public, anon;
grant execute on function public.admin_change_student_course(uuid,text,text) to authenticated;
