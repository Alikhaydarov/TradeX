alter table public.prop_accounts
  add column if not exists account_type text not null default 'prop',
  add column if not exists prop_site text not null default '',
  add column if not exists prop_login text not null default '',
  add column if not exists import_source text not null default 'manual',
  add column if not exists platform text not null default 'mt5';

alter table public.prop_accounts
  drop constraint if exists prop_accounts_account_type_check,
  add constraint prop_accounts_account_type_check check (account_type in ('prop', 'real'));

alter table public.prop_accounts
  drop constraint if exists prop_accounts_import_source_check,
  add constraint prop_accounts_import_source_check check (import_source in ('manual', 'metaapi', 'ctrader', 'official_api'));

comment on column public.prop_accounts.account_type is
  'Trading account category used by TradeWay onboarding: prop or real.';

comment on column public.prop_accounts.prop_site is
  'Prop firm or broker source selected by the user. Does not store dashboard credentials.';

comment on column public.prop_accounts.prop_login is
  'Optional external account/challenge identifier. Do not store passwords here.';

comment on column public.prop_accounts.import_source is
  'Preferred trade-history import route: manual, metaapi, ctrader or official prop API.';
