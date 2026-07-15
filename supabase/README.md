# TradeWay Supabase Architecture

`supabase/migrations` is the database source of truth. Migration files are an
append-only history: never edit, rename, or delete a migration that may already
have been applied to the remote project.

## Project rules

1. Create every schema change as a new migration named
   `YYYYMMDDHHMM_description.sql`.
2. Review the migration locally, commit it with its application code, then deploy
   it once through the Supabase CLI or the SQL Editor.
3. Do not make untracked structural edits through the Dashboard. If an emergency
   edit is made there, capture it immediately with `supabase db pull` before the
   next deployment.
4. Do not squash or renumber the existing history while the production database
   is live. A clean baseline may be created later for a new environment only.

## Migration groups

- `001` through `015`: original social, journal, account, and MT5 foundations.
- `20260626` through `20260704`: connector, import, and subscription features.
- `20260715` onward: plan model, admin access, performance, and security hardening.

The two historical `015_*` files intentionally remain untouched. They were
already part of the project history; new migrations use full timestamps to avoid
another collision.

## Standard deployment

Install the Supabase CLI, then from the repository root:

```powershell
npx supabase login
npx supabase link --project-ref qhgidvkzquduoqvjmyod
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Run one deployment at a time. If `migration list` shows a mismatch, inspect the
actual schema first. Use `supabase migration repair` only after confirming which
migrations have really been applied.

## Required server environment

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY
DATABASE_URL=postgresql://... # required by queue/worker fallbacks
CONNECTOR_ENCRYPTION_KEY=base64-or-hex-32-byte-key
MT5_CONNECTOR_SECRET=long-random-server-only-secret
```

`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CONNECTOR_ENCRYPTION_KEY`, and
`MT5_CONNECTOR_SECRET` are server-only values. They must never be sent to the
browser or placed in variables prefixed with `NEXT_PUBLIC_`.

## Health checks

Run `supabase/audits/platform-health.sql` from the SQL Editor after a deployment
or when performance changes. It is read-only and checks RLS, index candidates,
plan integrity, sync queue health, and MT5 account health.

## Security model

- Browser access uses the authenticated role and RLS.
- Admin actions use constrained RPC functions, never arbitrary client-side
  service-role access.
- MT5 credentials are AES-GCM encrypted and are readable only by trusted server
  routes and connector workers. The browser can read account metadata but never
  `encrypted_password`.
