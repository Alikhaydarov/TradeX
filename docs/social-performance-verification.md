# Social and journal interaction verification

## Changes

- Feed, trader profiles and journal use the existing TanStack Query dependency.
  The client cache belongs to one authenticated workspace, expires after five
  inactive minutes and is never persisted to disk. Queries remain private.
- Search debounces input, aborts obsolete requests and prefetches the first two
  profile results. Profile links also prefetch on pointer/focus intent.
- Likes, reposts and follows submit a desired boolean state. Reaction inserts use
  conflict-safe upserts. Each post action has its own pending state and rollback.
- Feed and profile share one post renderer and reaction cache. Replies keep
  separate drafts per post. Reposts have a dedicated profile tab.
- Journal filters by the owned account before applying its 250-row result limit.
  Returning to a cached journal does not replace its content with a loader.
- The original black logo/ring loader is restored without minimum display timers
  or audio. Mobile action counts are compact, tabular and never wrap.

## Regression tests

Run from `apps/web`:

```sh
pnpm test:social
pnpm test:metrics
pnpm exec eslint src scripts
pnpm exec tsc --noEmit
```

`test:social` executes the actual reaction route against a fake database adapter
and tests the actual query-cache helpers. It covers duplicate desired-state
requests, isolated rollbacks, shared cache updates, authentication, invalid
inputs and a successful mutation followed by an unavailable count query.

## Chrome interaction checks

The real components were mounted in a temporary development-only fixture with
delayed mock API responses. The fixture was removed after testing; no production
posts, replies or trades were created by these checks.

- Publish: inserted post is visible; the draft clears only after success.
- Like/repost: immediate update; other posts stay interactive. An injected 503
  restores the previous like state and shows an inline error.
- Replies: drafts do not leak between posts; a sent reply includes its author.
- Profile: feed reaction state is preserved; reposts and follow states render.
- Journal: navigating away and back retains trades with no full loading state.
- Mobile: 320px and 390px widths have no post/composer horizontal overflow;
  multi-digit counts stay on one line. No console errors in the checked fixture.

The final local production build was blocked by a Windows EPERM creating a
generated `.next/server` directory. This is not a successful build result;
production release must be confirmed using the Vercel build for the pushed SHA.

Cold navigation still depends on network, authentication and database latency.
These changes do not promise a universal 100ms server response.
