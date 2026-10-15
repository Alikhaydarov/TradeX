-- Five index pairs where both members have byte-identical definitions. They
-- accumulated because a later migration re-created an index the schema already
-- had, under a new name - and two of them (journal_entries_prop_account_traded_idx,
-- post_replies_post_idx) exist only in the database, with no migration that
-- creates them at all.
--
-- A duplicate index cannot make a read faster: the planner picks one and the
-- other is dead weight that every INSERT, UPDATE and DELETE still has to
-- maintain. The tables are small today, so this is hygiene rather than a
-- measurable speed-up - the point is that the cost grows with row count, and
-- it is cheaper to remove them now than after they matter.
--
-- Where the pair had a usage history, the survivor is the one Postgres is
-- actually using (pg_stat_user_indexes.idx_scan); the one being dropped had
-- zero scans in every case. No dropped index backs a constraint.

-- kept: journal_entries_prop_account_idx (1738 scans)
drop index if exists public.journal_entries_prop_account_traded_idx;

-- kept: posts_user_created_idx (447 scans)
drop index if exists public.posts_user_id_idx;

-- kept: post_replies_post_id_created_at_idx (both unused; keeps the named-for-its-columns one)
drop index if exists public.post_replies_post_idx;

-- kept: prop_accounts_user_created_idx (both unused; keeps the newer definition)
drop index if exists public.prop_accounts_user_idx;

-- kept: raw_trade_events_account_received_idx (both unused; keeps the newer definition)
drop index if exists public.raw_trade_events_account_idx;
