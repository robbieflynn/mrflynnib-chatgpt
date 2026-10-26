-- One authentication identity can use both the IB and IGCSE areas.
-- Curriculum continues to be stored on every class, progress and whiteboard row.

create or replace function public.teaches_class(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes c
    where c.id = class_uuid and c.teacher_id = account_id
  )
$$;

create or replace function public.is_class_member(class_uuid uuid, account_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_memberships cm
    where cm.class_id = class_uuid and cm.student_id = account_id
  )
$$;

create or replace function public.join_class_by_code(raw_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare selected_class uuid;
begin
  if auth.uid() is null then raise exception 'You must sign in first.'; end if;
  select id into selected_class
    from public.classes where join_code = upper(trim(raw_code)) and not archived;
  if selected_class is null then raise exception 'That class code was not found.'; end if;
  if public.is_teacher(auth.uid()) then raise exception 'Teacher accounts cannot join student classes.'; end if;
  insert into public.class_memberships (class_id, student_id)
    values (selected_class, auth.uid()) on conflict do nothing;
  return selected_class;
end;
$$;

drop policy if exists "Teachers manage own classes" on public.classes;
create policy "Teachers manage own classes" on public.classes for all
  using (teacher_id = (select auth.uid()) and public.is_teacher())
  with check (teacher_id = (select auth.uid()) and public.is_teacher());

drop policy if exists "Students read own progress" on public.question_progress;
create policy "Students read own progress" on public.question_progress for select
  using ((select auth.uid()) = user_id);
drop policy if exists "Students insert own progress" on public.question_progress;
create policy "Students insert own progress" on public.question_progress for insert
  with check ((select auth.uid()) = user_id and bank in ('ib', 'igcse'));
drop policy if exists "Students update own progress" on public.question_progress;
create policy "Students update own progress" on public.question_progress for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and bank in ('ib', 'igcse'));
drop policy if exists "Students delete own progress" on public.question_progress;
create policy "Students delete own progress" on public.question_progress for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Students read own whiteboards" on public.whiteboard_documents;
create policy "Students read own whiteboards" on public.whiteboard_documents for select
  using ((select auth.uid()) = user_id);
drop policy if exists "Students insert own whiteboards" on public.whiteboard_documents;
create policy "Students insert own whiteboards" on public.whiteboard_documents for insert
  with check ((select auth.uid()) = user_id and bank in ('ib', 'igcse'));
drop policy if exists "Students update own whiteboards" on public.whiteboard_documents;
create policy "Students update own whiteboards" on public.whiteboard_documents for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and bank in ('ib', 'igcse'));
drop policy if exists "Students delete own whiteboards" on public.whiteboard_documents;
create policy "Students delete own whiteboards" on public.whiteboard_documents for delete
  using ((select auth.uid()) = user_id);

create or replace function public.redeem_platform_access_code(raw_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  normalized_code text := regexp_replace(upper(coalesce(raw_code, '')), '[^A-Z0-9]', '', 'g');
  code_row public.platform_access_codes%rowtype;
  entitlement_id uuid;
  entitlement_expiry timestamptz;
begin
  if account_id is null then return jsonb_build_object('status', 'signed_out'); end if;
  if char_length(normalized_code) < 8 or char_length(normalized_code) > 64 then return jsonb_build_object('status', 'invalid'); end if;

  select access_code.* into code_row
  from public.platform_access_codes access_code
  where access_code.code_hash = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
    and access_code.status = 'active'
    and (access_code.expires_at is null or access_code.expires_at > now())
  for update;

  if code_row.id is null then return jsonb_build_object('status', 'invalid'); end if;
  if exists (select 1 from public.platform_access_code_redemptions redemption where redemption.code_id = code_row.id and redemption.user_id = account_id) then
    return jsonb_build_object('status', 'already_redeemed', 'product_code', code_row.product_code);
  end if;
  if code_row.redemption_count >= code_row.max_redemptions then return jsonb_build_object('status', 'unavailable'); end if;
  if code_row.product_code = 'teacher_plus_ib' and not exists (select 1 from public.profiles profile where profile.user_id = account_id and profile.role in ('teacher', 'admin')) then
    return jsonb_build_object('status', 'teacher_required');
  end if;
  if exists (select 1 from public.platform_entitlements entitlement where entitlement.user_id = account_id and entitlement.product_code = code_row.product_code and entitlement.status = 'active' and (entitlement.expires_at is null or entitlement.expires_at > now())) then
    return jsonb_build_object('status', 'already_active', 'product_code', code_row.product_code);
  end if;

  entitlement_expiry := case when code_row.access_days is null then null else now() + make_interval(days => code_row.access_days) end;
  insert into public.platform_entitlements (user_id, product_code, status, source, starts_at, expires_at, external_provider, external_reference, metadata)
  values (account_id, code_row.product_code, 'active', 'promotion', now(), entitlement_expiry, 'access-code', code_row.id::text || ':' || account_id::text, jsonb_build_object('code_id', code_row.id, 'code_hint', code_row.code_hint))
  returning id into entitlement_id;
  insert into public.platform_access_code_redemptions (code_id, user_id, entitlement_id) values (code_row.id, account_id, entitlement_id);
  update public.platform_access_codes set redemption_count = redemption_count + 1, updated_at = now() where id = code_row.id;
  return jsonb_build_object('status', 'redeemed', 'product_code', code_row.product_code, 'expires_at', entitlement_expiry);
end;
$$;

revoke all on function public.redeem_platform_access_code(text) from public;
revoke execute on function public.redeem_platform_access_code(text) from anon;
grant execute on function public.redeem_platform_access_code(text) to authenticated;
