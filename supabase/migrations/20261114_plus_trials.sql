-- One explicit, non-renewing IB trial per account. Never rewrite paid access.
create table if not exists public.platform_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  product_code text not null check (product_code in ('course_ib_aa_hl','course_ib_aa_sl','course_ib_ai_hl','course_ib_ai_sl','teacher_plus_ib')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at = starts_at + interval '168 hours')
);
alter table public.platform_trials enable row level security;
revoke all on public.platform_trials from anon, authenticated;
grant select on public.platform_trials to authenticated;
drop policy if exists "Read own trial" on public.platform_trials;
create policy "Read own trial" on public.platform_trials for select to authenticated using (user_id = auth.uid());

create or replace function public.start_plus_trial(requested_product text)
returns public.platform_trials language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  account_role text;
  approval text;
  confirmed_at timestamptz;
  existing public.platform_trials;
  trial_start timestamptz := now();
begin
  if account_id is null then raise exception 'sign_in_required'; end if;
  if requested_product is null or requested_product not in ('course_ib_aa_hl','course_ib_aa_sl','course_ib_ai_hl','course_ib_ai_sl','teacher_plus_ib') then
    raise exception 'invalid_product';
  end if;
  -- Serialise starts across tabs/products, so there is one immutable trial window.
  select p.role,p.teacher_status into account_role,approval from public.profiles p where p.user_id=account_id for update;
  if account_role is null then raise exception 'profile_required'; end if;
  select u.email_confirmed_at into confirmed_at from auth.users u where u.id=account_id;
  if confirmed_at is null then raise exception 'confirm_email'; end if;
  if requested_product='teacher_plus_ib' and (account_role <> 'teacher' or approval is distinct from 'approved') then
    raise exception 'teacher_required';
  end if;
  select * into existing from public.platform_trials where user_id=account_id;
  if found then
    if existing.product_code=requested_product and existing.expires_at>now() then return existing; end if;
    raise exception 'trial_used';
  end if;
  if account_role='admin' or exists (
    select 1 from public.platform_entitlements e where e.user_id=account_id and e.status='active'
      and (e.expires_at is null or e.expires_at>now())
      and (e.product_code like 'course_ib_%' or e.product_code in ('teacher_plus_ib','student_all_courses_ib'))
  ) or exists (
    select 1 from public.organization_license_seats s join public.organization_licenses l on l.id=s.license_id
    where s.user_id=account_id and s.revoked_at is null and l.status in ('active','pilot')
      and (l.ends_at is null or l.ends_at>now())
      and (l.product_code like 'course_ib_%' or l.product_code in ('teacher_plus_ib','student_all_courses_ib'))
  ) then raise exception 'access_active'; end if;
  insert into public.platform_trials values (account_id,requested_product,trial_start,trial_start+interval '168 hours') returning * into existing;
  insert into public.platform_entitlements(user_id,product_code,status,source,starts_at,expires_at,external_provider,external_reference,metadata)
    values(account_id,requested_product,'active','promotion',existing.starts_at,existing.expires_at,'plus_trial',account_id::text,jsonb_build_object('trial_days',7));
  return existing;
end;
$$;
revoke all on function public.start_plus_trial(text) from public, anon;
grant execute on function public.start_plus_trial(text) to authenticated;
