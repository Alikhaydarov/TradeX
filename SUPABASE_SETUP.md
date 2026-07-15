# TradeWay Supabase Setup

The database workflow, schema groups, health audit, and deployment commands are
documented in [supabase/README.md](supabase/README.md). Use migrations as the
only production schema source of truth.

## Environment

Copy `.env.example` to `.env.local` and set the required values:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVICE_ROLE_KEY
DATABASE_URL=postgresql://...
CONNECTOR_ENCRYPTION_KEY=base64-or-hex-32-byte-key
MT5_CONNECTOR_SECRET=long-random-server-only-secret
```

Get the Project URL and API keys from Supabase Dashboard -> Project Settings ->
API. Server secrets must remain on the server and must never use a
`NEXT_PUBLIC_` name.

## Google OAuth

1. Create an OAuth Web Client in Google Cloud Console.
2. Add the Supabase callback URL:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Add the Client ID and Client Secret in Supabase:
   `Authentication -> Providers -> Google`.
4. In `Authentication -> URL Configuration`, allow:
   - `http://localhost:3000/auth/callback`
   - Your production `/auth/callback` URL.

## Run locally

```powershell
npm run dev
```

Application database work is performed by the same-domain Node.js `/api/*`
routes. Do not place service keys in browser code.
