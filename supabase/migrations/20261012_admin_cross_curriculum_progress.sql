-- Administrators can review and use both curriculum areas while ordinary
-- student and teacher accounts remain restricted to their own curriculum.

drop policy if exists "Students read own progress" on public.question_progress;
create policy "Students read own progress" on public.question_progress for select
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students insert own progress" on public.question_progress;
create policy "Students insert own progress" on public.question_progress for insert
  with check (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students update own progress" on public.question_progress;
create policy "Students update own progress" on public.question_progress for update
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  )
  with check (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students delete own progress" on public.question_progress;
create policy "Students delete own progress" on public.question_progress for delete
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students read own whiteboards" on public.whiteboard_documents;
create policy "Students read own whiteboards" on public.whiteboard_documents for select
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students insert own whiteboards" on public.whiteboard_documents;
create policy "Students insert own whiteboards" on public.whiteboard_documents for insert
  with check (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students update own whiteboards" on public.whiteboard_documents;
create policy "Students update own whiteboards" on public.whiteboard_documents for update
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  )
  with check (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );

drop policy if exists "Students delete own whiteboards" on public.whiteboard_documents;
create policy "Students delete own whiteboards" on public.whiteboard_documents for delete
  using (
    (select auth.uid()) = user_id
    and (bank = public.profile_curriculum() or public.is_admin())
  );
