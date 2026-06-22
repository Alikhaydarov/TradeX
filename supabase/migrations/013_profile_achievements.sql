create table if not exists public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  issuer text not null default '',
  achievement_type text not null default 'funded',
  image_url text not null,
  issued_at date,
  created_at timestamptz not null default now()
);

create index if not exists profile_achievements_user_created_idx
  on public.profile_achievements(user_id, created_at desc);

alter table public.profile_achievements enable row level security;

drop policy if exists "Achievements are public" on public.profile_achievements;
create policy "Achievements are public"
  on public.profile_achievements for select using (true);

drop policy if exists "Users manage own achievements" on public.profile_achievements;
create policy "Users manage own achievements"
  on public.profile_achievements for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
