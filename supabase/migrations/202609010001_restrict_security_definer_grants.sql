-- Every SECURITY DEFINER function in `public` runs with the definer's rights,
-- and Postgres grants EXECUTE to PUBLIC by default. PostgREST turns that into a
-- callable endpoint at /rest/v1/rpc/<name> for the `anon` role - so twenty-one
-- of these were reachable without signing in, including admin_set_user_access.
--
-- Each of them does check permission internally (verified against every body
-- before writing this), so this is defence in depth rather than a fix for a
-- live hole. What it removes is the ability to reach them at all.
--
-- The grants are pared back to what is actually used. That was established
-- from three places, not from guesswork:
--   * pg_policies - which functions RLS actually evaluates, and for which role
--   * pg_proc.prosrc - which functions call each other (a nested call runs as
--     the definer, so the caller needs no EXECUTE of its own)
--   * the application's own `.rpc(...)` calls
--
-- Nothing loses a grant that any of those three needs.

-- 1. Trigger functions. These are invoked by the trigger machinery, which does
--    not check EXECUTE at fire time (it is checked once, at CREATE TRIGGER).
--    Nobody should be able to call them directly, and calling them over REST
--    was never meaningful.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_mt5_trade_to_journal() from public, anon, authenticated;
revoke all on function public.sync_post_likes_count() from public, anon, authenticated;
revoke all on function public.sync_post_replies_count() from public, anon, authenticated;
revoke all on function public.sync_post_reposts_count() from public, anon, authenticated;

-- 2. No external caller at all: not referenced by any policy, not called by any
--    other function, not called by the app. chat_is_active_member is reached
--    only from inside chat_can_read_channel, which is SECURITY DEFINER and so
--    needs no grant of its own.
revoke all on function public.chat_is_active_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.chat_user_has_premium(uuid) from public, anon, authenticated;
revoke all on function public.is_chat_member(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_user_verification(uuid, boolean) from public, anon, authenticated;

-- 3. Genuine RPCs the app calls, but only ever as a signed-in user. `anon`
--    could call these; every one of them resolves the caller through
--    auth.uid(), so for `anon` they either raise or no-op - work done purely on
--    behalf of an unauthenticated caller.
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) from public, anon;
revoke all on function public.archive_post(uuid) from public, anon;
revoke all on function public.archive_chat(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.record_unique_post_view(uuid) from public, anon;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_access(uuid, text, boolean, timestamptz, boolean) to authenticated;
grant execute on function public.archive_post(uuid) to authenticated;
grant execute on function public.archive_chat(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.record_unique_post_view(uuid) to authenticated;

-- 4. RLS helpers. Policies on channels, messages, message_reads,
--    message_reactions, group_members and realtime.messages call these, and RLS
--    expressions are evaluated as the calling role - so `authenticated` must
--    keep EXECUTE or chat stops working entirely. Every one of those policies
--    is scoped to `authenticated`, so `anon` can lose it.
revoke all on function public.chat_can_read_channel(uuid, uuid) from public, anon;
revoke all on function public.chat_can_read_message(uuid, uuid) from public, anon;
revoke all on function public.chat_can_send_channel(uuid, uuid) from public, anon;
revoke all on function public.chat_is_community_admin(uuid, uuid) from public, anon;
revoke all on function public.chat_is_dm_participant(uuid, uuid) from public, anon;
revoke all on function public.chat_can_access_realtime_topic(text, uuid) from public, anon;
revoke all on function public.is_group_member(uuid) from public, anon;

grant execute on function public.chat_can_read_channel(uuid, uuid) to authenticated;
grant execute on function public.chat_can_read_message(uuid, uuid) to authenticated;
grant execute on function public.chat_can_send_channel(uuid, uuid) to authenticated;
grant execute on function public.chat_is_community_admin(uuid, uuid) to authenticated;
grant execute on function public.chat_is_dm_participant(uuid, uuid) to authenticated;
grant execute on function public.chat_can_access_realtime_topic(text, uuid) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
