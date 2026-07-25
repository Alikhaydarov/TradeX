# Community chat architecture

TradeX community chat is a private, realtime workspace available at:

```text
/community/{community_id}/chat
```

## Stack

- Next.js App Router Route Handlers for all committed writes and paginated reads.
- Supabase Postgres for channels, direct-message threads, messages, reactions and read receipts.
- Supabase Realtime Broadcast for message/edit/delete/reaction events.
- Supabase Realtime Presence for online and typing state.
- Existing Supabase Auth cookies and TradeX premium status.

## Database

Migrations:

- `supabase/migrations/20260726000200_add_community_chat.sql`
- `supabase/migrations/20260726000300_add_chat_realtime_authorization.sql`

The first migration extends existing `communities` and `community_members` rows and creates:

- `channels`
- `dm_threads`
- `messages`
- `message_reactions`
- `message_reads`

A message must point to exactly one destination: `channel_id` or `dm_thread_id`. Pagination indexes are ordered by destination and `created_at`. `sender_id + client_id` is unique for optimistic-send reconciliation.

## Security

Application APIs authenticate every request. The database also has RLS so direct Supabase access remains scoped:

- active, non-banned members can read their community channels;
- premium-only channels require an active paid plan;
- muted members cannot send channel messages;
- DM threads are visible only to their two participants;
- senders may edit their own messages;
- senders and community owner/admin roles may soft-delete allowed messages;
- reactions and read receipts are scoped to accessible rooms.

Realtime channels are private. Authorization policies on `realtime.messages` parse the topic and call the same access helpers used by chat RLS.

## Realtime topics

```text
channel:{channel_id}
dm:{dm_thread_id}
```

Each topic carries:

- Broadcast event: `chat-event`
- Presence payload: user id, username, name, avatar, online timestamp and typing boolean

The client commits through a Route Handler first and broadcasts only the confirmed row afterward. This avoids broadcasting writes that failed. Broadcast is ephemeral, so reconnect handling reloads the latest API page to heal missed events.

## API routes

- `GET /api/community-chat/context?communityId=...`
- `POST /api/community-chat/channels`
- `GET|POST /api/community-chat/messages`
- `PATCH|DELETE /api/community-chat/messages/{id}`
- `POST /api/community-chat/reactions`
- `POST /api/community-chat/read`
- `POST /api/community-chat/dms`
- `POST /api/community-chat/moderation`

Message fetch uses an opaque cursor derived from `created_at + id`. Send is limited server-side to eight messages per ten seconds per user.

## Frontend

Main components live in `src/components/chat/`:

- `chat-layout.tsx`
- `community-sidebar.tsx`
- `chat-header.tsx`
- `message-list.tsx`
- `message-bubble.tsx`
- `message-composer.tsx`
- `typing-indicator.tsx`
- `presence-dot.tsx`
- `unread-badge.tsx`

Hooks live in `src/features/community-chat/hooks/`:

- `use-messages-pagination.ts`
- `use-realtime-channel.ts`

The desktop view uses a compact channel/DM sidebar and chat panel. Mobile uses a drawer. Messages are grouped by day, older pages load when scrolling upward, and a jump-to-latest button appears when the user is reading older messages.

## Environment

Set these in Vercel in addition to existing server Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

The publishable key is intended for browser use. Authorization comes from the signed user session plus RLS, never from hiding this key.

In Supabase Realtime Settings, disable public channel access after the private Realtime policies are applied.

## Apply and verify

1. Run both migrations in order.
2. Add the two `NEXT_PUBLIC_...` environment variables.
3. Redeploy.
4. Open a community and create/use the seeded `general` channel.
5. Test with two accepted members in separate browsers.
6. Verify messages, typing, online state, replies, edits, soft-delete, reactions and unread counts.

## Generated TypeScript database types

When the Supabase CLI is available, regenerate project database types and merge them into the repository convention:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/database.types.ts
```

The chat-facing application types remain in `src/features/community-chat/types.ts` so UI code does not depend directly on snake_case database rows.
