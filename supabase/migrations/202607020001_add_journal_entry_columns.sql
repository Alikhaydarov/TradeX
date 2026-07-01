alter table public.journal_entries
  add column if not exists setup text default '',
  add column if not exists emotion text default 'Neutral',
  add column if not exists risk_amount numeric default 0,
  add column if not exists result_r numeric default 0,
  add column if not exists risk_percent text default '1.0%',
  add column if not exists session text default '',
  add column if not exists following_plan boolean default true,
  add column if not exists error_made boolean default false,
  add column if not exists mistake_type text default '',
  add column if not exists review_completed boolean default false,
  add column if not exists to_trading_bible boolean default false,
  add column if not exists image_url text,
  add column if not exists tags text[] default '{}';
