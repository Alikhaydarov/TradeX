alter table public.prop_accounts
  drop constraint if exists prop_accounts_status_check,
  add constraint prop_accounts_status_check
    check (status in ('Processing', 'Active', 'Passed', 'Failed', 'Paused'));

comment on column public.prop_accounts.status is
  'Account lifecycle. Processing is used while connector history import is queued or running.';

create index if not exists ai_reports_user_account_idx
  on public.ai_reports(user_id, account_id, created_at desc);
