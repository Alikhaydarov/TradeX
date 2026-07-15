-- Keeps public profile routes predictable. Reserved names are enforced by the API,
-- while this constraint prevents malformed handles from reaching the database.
alter table public.profiles
  add constraint profiles_username_format_guard
  check (
    username ~ '^[a-z][a-z0-9_]{2,23}$'
    and username !~ '__'
    and username !~ '_$'
  ) not valid;
