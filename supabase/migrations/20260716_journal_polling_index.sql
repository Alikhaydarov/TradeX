-- Supports the lightweight ETag check used by the journal's five-second sync.
-- The full entry payload is only fetched when the account history changes.
create index if not exists journal_entries_user_account_updated_idx
  on public.journal_entries (user_id, prop_account_id, updated_at desc);
