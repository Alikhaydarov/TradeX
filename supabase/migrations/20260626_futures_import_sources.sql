alter table public.prop_accounts
  drop constraint if exists prop_accounts_import_source_check,
  add constraint prop_accounts_import_source_check
    check (import_source in ('manual', 'metaapi', 'ctrader', 'tradovate', 'ninjatrader', 'official_api'));

comment on column public.prop_accounts.import_source is
  'Trade import route: manual, MT5 MetaAPI, cTrader, Tradovate, NinjaTrader, or official prop API.';
