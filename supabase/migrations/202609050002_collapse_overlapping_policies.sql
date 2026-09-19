-- Tradoxy — collapse the remaining overlapping permissive policies
--
-- The first pass removed the pairs that were textually identical. What was left
-- were overlaps of a subtler kind, all of which came from the same two habits:
--
--   a) the same rule written twice, once TO authenticated and once TO public.
--      In Postgres, TO public means every role, so the public copy already covers
--      authenticated and the pair is evaluated twice on every row. The public copy
--      also nominally extends to anon — but its predicate is auth.uid() = user_id,
--      and auth.uid() is null for anon, so it grants anon nothing. Dropping the
--      public copy therefore takes nothing away and leaves the tighter of the two.
--
--   b) a FOR ALL policy sitting on top of per-command policies. FOR ALL includes
--      SELECT, so it collides with the public read policy on every read. Splitting
--      it into the commands it actually needs to cover keeps every capability and
--      leaves exactly one policy per command.
--
-- Every change below is a no-op for access. Verified after applying by re-reading
-- each table as a real authenticated user.

-- (a) authenticated/public duplicates
drop policy if exists "Users delete own replies" on public.post_replies;   -- twin of "Users can remove own replies"
drop policy if exists "Users create own replies" on public.post_replies;   -- twin of "Users can create own replies"

-- profiles: both policies were USING (true); the public one already covers
-- authenticated, so the authenticated one can only ever have been redundant.
drop policy if exists "Authenticated users can view profiles" on public.profiles;

-- (b) FOR ALL policies split into the commands they need
--
-- post_reposts already has SELECT (public), INSERT and DELETE policies. The only
-- command "Users manage own reposts" contributed on top of those was UPDATE, so
-- that is what it becomes. Nothing in the app updates a repost row, but keeping
-- the capability makes this a strict no-op rather than a judgement call.
drop policy if exists "Users manage own reposts" on public.post_reposts;

create policy "Users update own reposts" on public.post_reposts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- profile_achievements: "Achievements are public" already covers reads, so the
-- FOR ALL policy only needs to cover the three write commands.
drop policy if exists "Users manage own achievements" on public.profile_achievements;

create policy "Users create own achievements" on public.profile_achievements
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own achievements" on public.profile_achievements
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own achievements" on public.profile_achievements
  for delete to authenticated
  using ((select auth.uid()) = user_id);
