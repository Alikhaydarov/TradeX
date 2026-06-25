-- Make password_encrypted nullable (credentials may be set later)
alter table public.mt5_connections
  alter column password_encrypted drop not null;

-- Add sync_interval_minutes and auto_sync flag
alter table public.mt5_connections
  add column if not exists auto_sync boolean not null default true,
  add column if not exists sync_from_date date;
