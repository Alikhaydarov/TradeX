alter table journal_entries
  add column if not exists risk_percent text default '1.0%',
  add column if not exists session text default '',
  add column if not exists following_plan boolean default true,
  add column if not exists error_made boolean default false,
  add column if not exists mistake_type text default '',
  add column if not exists review_completed boolean default false,
  add column if not exists to_trading_bible boolean default false;

comment on column journal_entries.risk_percent is 'Notion: Risk % select (0.25%, 0.5%, 1.0%, 2.0%, 4.0%)';
comment on column journal_entries.session is 'Notion: Session/Time (London, New York, Asian, ...)';
comment on column journal_entries.following_plan is 'Notion: Following plan?';
comment on column journal_entries.error_made is 'Notion: Error made?';
comment on column journal_entries.mistake_type is 'Notion: Error Made (relation -> Outside of Plan mistake taxonomy)';
comment on column journal_entries.review_completed is 'Notion: Review Completed';
comment on column journal_entries.to_trading_bible is 'Notion: + to Trading Bible?';