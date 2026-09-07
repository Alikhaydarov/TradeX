-- Reporting a post.
--
-- The feed had no moderation surface of any kind: no report, no block, no
-- queue. A public feed without one puts the entire burden on someone noticing
-- a bad post themselves, and gives readers nothing to do about it but leave.
--
-- One row per (post, reporter). The unique constraint is the whole
-- deduplication story - reporting twice is idempotent rather than an error, so
-- the client never has to ask "did I already report this?" first.

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  -- Constrained rather than free text: a fixed set is what makes the queue
  -- sortable and countable, and the note carries anything that does not fit.
  reason text not null check (
    reason in ('spam', 'harassment', 'misinformation', 'scam', 'off_topic', 'other')
  ),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

-- The queue reads open reports newest-first; the partial index keeps that scan
-- proportional to the open ones rather than to everything ever reported.
create index if not exists post_reports_open_idx
  on public.post_reports (created_at desc)
  where status = 'open';

create index if not exists post_reports_post_idx
  on public.post_reports (post_id);

alter table public.post_reports enable row level security;

-- auth.uid() and is_admin() are wrapped in a scalar subquery so the planner
-- evaluates them once per statement instead of once per row. The rest of this
-- schema does not do that yet and shows up in the Supabase performance
-- advisor for it; no reason to add another table to that list.

drop policy if exists post_reports_insert on public.post_reports;
create policy post_reports_insert on public.post_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists post_reports_select on public.post_reports;
create policy post_reports_select on public.post_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

-- Only a moderator resolves a report. Reporters deliberately cannot withdraw
-- one: the row is the evidence that a decision was made, and letting it vanish
-- mid-review would lose that.
drop policy if exists post_reports_update on public.post_reports;
create policy post_reports_update on public.post_reports
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Supabase's default privileges hand `authenticated` full DML on every new
-- table in this schema, so the grants below have to start by taking that away -
-- otherwise this table would keep a DELETE privilege that nothing needs and
-- only RLS is holding shut. Deleting a report is not an operation anyone has:
-- resolving one is an UPDATE, and the row is the record that a decision was
-- made.
revoke all on table public.post_reports from anon, authenticated;
grant select, insert on table public.post_reports to authenticated;
grant update (status, reviewed_by, reviewed_at) on table public.post_reports to authenticated;

comment on table public.post_reports is
  'Reader-submitted reports about feed posts, one per reporter per post.';
