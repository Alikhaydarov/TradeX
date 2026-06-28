update public.prop_accounts
set import_source = 'mt5_bridge'
where import_source in ('metaapi', 'mtapi');

alter table public.prop_accounts
  drop constraint if exists prop_accounts_import_source_check,
  add constraint prop_accounts_import_source_check
    check (import_source in ('manual', 'mt5_bridge', 'ctrader', 'tradovate', 'ninjatrader', 'official_api'));

comment on column public.prop_accounts.import_source is
  'Trade import route: manual, TradeWay self-hosted MT5 bridge, cTrader, Tradovate, NinjaTrader, or official prop API. MetaAPI/MTAPI cloud imports are retired.';
