-- A flexible student code can be redeemed against any one IB course.
-- The selected course is stored as the real entitlement; the code never grants
-- the all-courses student product.

create or replace function public.redeem_platform_access_code_for_product(
  raw_code text,
  requested_product_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  normalized_code text := regexp_replace(upper(coalesce(raw_code, '')), '[^A-Z0-9]', '', 'g');
  code_row public.platform_access_codes%rowtype;
  entitlement_product_code text;
  entitlement_id uuid;
  entitlement_expiry timestamptz;
  account_role text;
begin
  if account_id is null then
    return jsonb_build_object('status', 'signed_out');
  end if;

  if char_length(normalized_code) < 8 or char_length(normalized_code) > 64 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select access_code.*
  into code_row
  from public.platform_access_codes access_code
  where access_code.code_hash = encode(extensions.digest(normalized_code, 'sha256'), 'hex')
    and access_code.status = 'active'
    and (access_code.expires_at is null or access_code.expires_at > now())
  for update;

  if code_row.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (
    select 1
    from public.platform_access_code_redemptions redemption
    where redemption.code_id = code_row.id and redemption.user_id = account_id
  ) then
    return jsonb_build_object('status', 'already_redeemed', 'product_code', code_row.product_code);
  end if;

  if code_row.redemption_count >= code_row.max_redemptions then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select profile.role
  into account_role
  from public.profiles profile
  where profile.user_id = account_id;

  if code_row.product_code = 'student_choose_one_ib' then
    if coalesce(account_role, '') not in ('student', 'admin') then
      return jsonb_build_object('status', 'student_required');
    end if;

    if requested_product_code not in (
      'course_ib_aa_hl',
      'course_ib_aa_sl',
      'course_ib_ai_hl',
      'course_ib_ai_sl'
    ) then
      return jsonb_build_object('status', 'course_required');
    end if;

    entitlement_product_code := requested_product_code;
  else
    entitlement_product_code := code_row.product_code;
  end if;

  if entitlement_product_code = 'teacher_plus_ib' and coalesce(account_role, '') not in ('teacher', 'admin') then
    return jsonb_build_object('status', 'teacher_required');
  end if;

  if exists (
    select 1
    from public.platform_entitlements entitlement
    where entitlement.user_id = account_id
      and entitlement.product_code = entitlement_product_code
      and entitlement.status = 'active'
      and (entitlement.expires_at is null or entitlement.expires_at > now())
  ) then
    return jsonb_build_object('status', 'already_active', 'product_code', entitlement_product_code);
  end if;

  entitlement_expiry := case
    when code_row.access_days is null then null
    else now() + make_interval(days => code_row.access_days)
  end;

  insert into public.platform_entitlements (
    user_id,
    product_code,
    status,
    source,
    starts_at,
    expires_at,
    external_provider,
    external_reference,
    metadata
  ) values (
    account_id,
    entitlement_product_code,
    'active',
    'promotion',
    now(),
    entitlement_expiry,
    'access-code',
    code_row.id::text || ':' || account_id::text,
    jsonb_build_object(
      'code_id', code_row.id,
      'code_hint', code_row.code_hint,
      'code_product_code', code_row.product_code,
      'selected_product_code', entitlement_product_code
    )
  ) returning id into entitlement_id;

  insert into public.platform_access_code_redemptions (code_id, user_id, entitlement_id)
  values (code_row.id, account_id, entitlement_id);

  update public.platform_access_codes
  set redemption_count = redemption_count + 1, updated_at = now()
  where id = code_row.id;

  return jsonb_build_object(
    'status', 'redeemed',
    'product_code', entitlement_product_code,
    'expires_at', entitlement_expiry
  );
end;
$$;

revoke all on function public.redeem_platform_access_code_for_product(text, text) from public;
revoke execute on function public.redeem_platform_access_code_for_product(text, text) from anon;
grant execute on function public.redeem_platform_access_code_for_product(text, text) to authenticated;
