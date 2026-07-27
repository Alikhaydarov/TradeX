# App Router migration with UI parity

## Non-negotiable constraints

- Preserve the current production UI one-to-one while architecture changes.
- Keep `/` as Home. `/chat` is only a compatibility redirect to `/`.
- Keep existing card markup, dimensions, spacing, sidebar geometry and topbar unchanged until their dedicated parity phase.
- Keep the full-screen workspace boot loader mounted in the persistent root shell so it runs only on initial workspace boot, not on every route navigation.
- Do not remove a legacy CSS rule until its final cascade values have been reproduced at component level.

## Completed

- Root layout renders App Router `children` through a persistent UI-preserving workspace shell.
- Navigation uses `next/navigation` instead of manual history mutation in the new shell.
- Home, Accounts, Dashboard, Trades, Analytics, Calendar, Settings, Profile, Pricing and Community hub are real App Router pages.
- Trade detail, calendar month, username profile and Community detail/section routes are real App Router pages.
- `/journal` maps to the existing Dashboard journal workspace instead of introducing a duplicate UI.
- `/admin` maps to canonical `/superadmin`; the existing admin access check is preserved.
- Route navigation uses an in-content skeleton and App Router error boundary instead of remounting a full-screen route loader.
- Journal, Feed and Profile have compatibility module boundaries that preserve the unchanged legacy DOM.
- Accounts, Dashboard Stats, Trade List, Analytics and Calendar have separate lazy Journal modules.
- The floating add-trade action uses component-level Tailwind matching the final legacy cascade: 3.45rem dark-green rounded action, original shadow, hover and desktop/mobile positions.
- The AI launcher uses a Tailwind boundary matching the final legacy cascade: 3.1rem black launcher, centered 1.15rem icon and original responsive position.
- Conflicting mixed floating-action CSS files were removed; each action now has one styling owner.
- The duplicate dashboard KPI strip remains hidden through a Journal Tailwind boundary; the `display:none !important` cleanup stylesheet was removed.
- Typography override CSS was removed. DM Sans variables, font rendering, mono tabular numbers and MUI/Recharts inheritance now live in root Tailwind classes.
- CI runs UI parity scope validation, ESLint and production build on branch pushes and pull requests.
- The latest parity guard, ESLint and production build completed successfully.
- Existing legacy render paths remain as a temporary safety fallback for any route not yet migrated.

## Protected during the current phase

- Account/Profile cards
- Feed cards and composer
- Legacy Journal card and chart markup
- Sidebar and topbar geometry
- AI coach panel behavior
- Remaining workspace CSS files

## Next

1. Move the shared workspace width contract to route-specific Tailwind boundaries without changing page widths or padding.
2. Split more Journal internals behind the existing route modules while preserving rendered markup.
3. Migrate remaining navigation bridges inside legacy components to App Router APIs.
4. Convert remaining legacy CSS page by page only after each parity check.
5. Add desktop/mobile visual regression captures before merging to `main`.
