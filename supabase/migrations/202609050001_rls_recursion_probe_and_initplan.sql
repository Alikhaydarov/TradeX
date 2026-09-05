-- Tradoxy — RLS: recursion, cross-user probing, and per-row auth.uid()
--
-- Three separate problems, one migration because they all live in the policy layer.
--
-- 1. group_members was UNREADABLE. Its SELECT policy "Group members can view
--    chat members" contained EXISTS (select 1 from group_members ...) — a policy
--    on a table that reads the same table. Postgres refuses:
--      infinite recursion detected in policy for relation "group_members"
--    Because group_messages' policies read group_members, that table failed too.
--    Verified by querying both as a real authenticated user before this migration.
--    The second policy on the table, "Users can view own chat members", already
--    expressed the same rule through the SECURITY DEFINER helper is_group_member(),
--    which is exactly the predicate the recursive EXISTS spelled out inline — so
--    dropping the recursive one restores access without widening or narrowing it.
--
-- 2. The chat_* helpers took a target_user_id and never checked it. Any signed-in
--    user could ask, for any other user, whether they are in a DM thread, admin a
--    community, or can read a premium-only channel — the last of which leaks that
--    person's billing status. Nothing in the app calls these; they exist only for
--    RLS, and every policy passes auth.uid(). So the guard costs nothing real.
--    It is written as "= coalesce(auth.uid(), target_user_id)" so service_role and
--    definer-internal calls, which have no JWT, keep working.
--
-- 3. 36 policies called auth.uid() bare, which Postgres re-evaluates per row.
--    Wrapping it in (select ...) turns it into an InitPlan evaluated once per
--    query. Same for is_admin() and is_group_member(), which were VOLATILE and
--    therefore could not be hoisted or cached at all.
--
-- Nothing here changes who can see what, except group_members/group_messages,
-- which go from erroring to working.

-- ---------------------------------------------------------------------------
-- 1. Recursion
-- ---------------------------------------------------------------------------

alter policy "Users can view own chat members" on public.group_members
  using (
    user_id = (select auth.uid())
    or added_by = (select auth.uid())
    or public.is_group_member(group_id)
  );

drop policy if exists "Group members can view chat members" on public.group_members;

-- group_messages read group_members through a nested EXISTS, which meant a second
-- RLS evaluation per row. is_group_member() is the same predicate as a SECURITY
-- DEFINER function, so it skips that entirely.
alter policy "Chat members can view messages" on public.group_messages
  using (public.is_group_member(group_id));

alter policy "Chat members can send messages" on public.group_messages
  with check (
    (select auth.uid()) = user_id
    and public.is_group_member(group_id)
  );

-- ---------------------------------------------------------------------------
-- 2. Volatility — both are called from policies, both only read tables
-- ---------------------------------------------------------------------------

alter function public.is_admin() stable;
alter function public.is_group_member(uuid) stable;

-- ---------------------------------------------------------------------------
-- 3. chat_* helpers: answer only about the caller
-- ---------------------------------------------------------------------------

create or replace function public.chat_is_dm_participant(target_thread_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select target_user_id = coalesce((select auth.uid()), target_user_id)
     and exists (
       select 1 from public.dm_threads d
       where d.id = target_thread_id
         and target_user_id in (d.user_one_id, d.user_two_id)
     );
$$;

create or replace function public.chat_is_community_admin(target_community_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select target_user_id = coalesce((select auth.uid()), target_user_id)
     and (
       exists (
         select 1 from public.communities c
         where c.id = target_community_id and c.owner_id = target_user_id
       )
       or exists (
         select 1 from public.community_members cm
         where cm.community_id = target_community_id
           and cm.user_id = target_user_id
           and cm.status = 'active'
           and cm.role in ('owner', 'admin')
           and coalesce(cm.banned, false) = false
       )
     );
$$;

create or replace function public.chat_can_read_channel(target_channel_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select target_user_id = coalesce((select auth.uid()), target_user_id)
     and exists (
       select 1
       from public.channels ch
       where ch.id = target_channel_id
         and ch.community_id is not null
         and public.chat_is_active_member(ch.community_id, target_user_id)
         and (not ch.is_premium_only or public.chat_user_has_premium(target_user_id))
     );
$$;

create or replace function public.chat_can_send_channel(target_channel_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select target_user_id = coalesce((select auth.uid()), target_user_id)
     and exists (
       select 1
       from public.channels ch
       left join public.community_members cm
         on cm.community_id = ch.community_id and cm.user_id = target_user_id
       left join public.communities c on c.id = ch.community_id
       where ch.id = target_channel_id
         and public.chat_can_read_channel(ch.id, target_user_id)
         and (
           c.owner_id = target_user_id
           or (cm.status = 'active' and coalesce(cm.banned, false) = false
             and (cm.muted_until is null or cm.muted_until <= now()))
         )
     );
$$;

create or replace function public.chat_can_read_message(target_message_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select target_user_id = coalesce((select auth.uid()), target_user_id)
     and exists (
       select 1 from public.messages m
       where m.id = target_message_id
         and (
           (m.channel_id is not null and public.chat_can_read_channel(m.channel_id, target_user_id))
           or (m.dm_thread_id is not null and public.chat_is_dm_participant(m.dm_thread_id, target_user_id))
         )
     );
$$;

create or replace function public.chat_can_access_realtime_topic(target_topic text, target_user_id uuid)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare
  topic_kind text;
  topic_id_text text;
  topic_id uuid;
begin
  if target_user_id is distinct from coalesce(auth.uid(), target_user_id) then
    return false;
  end if;

  topic_kind := split_part(target_topic, ':', 1);
  topic_id_text := split_part(target_topic, ':', 2);

  if topic_kind not in ('channel', 'dm')
    or topic_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  topic_id := topic_id_text::uuid;
  if topic_kind = 'channel' then
    return public.chat_can_read_channel(topic_id, target_user_id);
  end if;

  return public.chat_is_dm_participant(topic_id, target_user_id);
end;
$$;

-- chat_is_active_member and chat_user_has_premium are deliberately left alone:
-- authenticated has no EXECUTE on either (they are only reachable from inside the
-- definer functions above), so there is no probe to close and no reason to pay for
-- a redundant check on the hot path.

-- ---------------------------------------------------------------------------
-- 4. Duplicate permissive policies
--
-- Each pair below is textually identical in expression, command and role — the
-- same rule applied twice by two migrations. Postgres evaluates both on every
-- row. Dropping one of each is a no-op for access.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can create follow notifications" on public.notifications;
drop policy if exists "Replies are visible to everyone"       on public.post_replies;
drop policy if exists "Reposts are visible to everyone"       on public.post_reposts;
drop policy if exists "Users delete own prop accounts"        on public.prop_accounts;
drop policy if exists "Users create own prop accounts"        on public.prop_accounts;
drop policy if exists "Users view own prop accounts"          on public.prop_accounts;
drop policy if exists "Users update own prop accounts"        on public.prop_accounts;

-- ---------------------------------------------------------------------------
-- 5. Hoist bare auth.uid() into an InitPlan
--
-- Done as a loop rather than 30-odd hand-written ALTERs so the rewrite is
-- mechanical and cannot be mistyped: it reads each policy's current expression
-- from the catalogue and rewrites only the bare occurrences, leaving any already
-- wrapped as ( SELECT auth.uid() AS uid ) untouched. ALTER POLICY preserves the
-- command, roles and permissive/restrictive flag, so nothing else can drift.
-- Idempotent: on a second run the WHERE clause matches nothing.
-- ---------------------------------------------------------------------------

do $$
declare
  stmts text[] := '{}';
  s text;
begin
  select coalesce(array_agg(
    'alter policy ' || quote_ident(policyname) || ' on public.' || quote_ident(tablename)
    || coalesce(' using (' || regexp_replace(qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') || ')', '')
    || coalesce(' with check (' || regexp_replace(with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g') || ')', '')
  ), '{}')
  into stmts
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '(?<!SELECT )auth\.uid\(\)';

  foreach s in array stmts loop
    execute s;
  end loop;

  raise notice 'hoisted auth.uid() in % policies', array_length(stmts, 1);
end $$;
