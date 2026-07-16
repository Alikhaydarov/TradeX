create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 280),
  accent text not null default 'emerald' check (accent in ('emerald', 'sky', 'amber', 'rose')),
  status text not null default 'active' check (status in ('active', 'read_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'declined', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_account_shares (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prop_account_id uuid not null references public.prop_accounts(id) on delete cascade,
  show_pnl_percent boolean not null default true,
  show_dollar_pnl boolean not null default false,
  show_win_rate boolean not null default true,
  show_trade_count boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (community_id, user_id, prop_account_id)
);

create index if not exists community_members_user_status_idx
  on public.community_members(user_id, status, community_id);
create index if not exists community_shares_community_idx
  on public.community_account_shares(community_id, user_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_account_shares enable row level security;

revoke all on public.communities, public.community_members, public.community_account_shares
  from anon, authenticated;

comment on table public.communities is 'Pro-owned TradeWay trading communities; one per owner.';
comment on table public.community_account_shares is 'Explicit per-account community result-sharing consent.';
