# App Router migration with UI parity

## Non-negotiable constraints

- Preserve the current production UI one-to-one while architecture changes.
- Keep `/` as Home. `/chat` is only a compatibility redirect to `/`.
- Keep existing card markup, dimensions, spacing, sidebar geometry, topbar and AI launcher unchanged until their dedicated parity phase.
- Keep the full-screen workspace boot loader mounted in the persistent root shell so it runs only on initial workspace boot, not on every route navigation.
- Do not remove a legacy CSS rule until its exact visual values have been reproduced at component level.

## Completed

- Root layout renders App Router `children` through a persistent UI-preserving workspace shell.
- Navigation uses `next/navigation` instead of manual history mutation in the new shell.
- Home, Accounts, Dashboard, Trades, Analytics, Calendar, Settings, Profile, Pricing and Community hub are real App Router pages.
- Trade detail, calendar month, username profile and Community detail/section routes are real App Router pages.
- `/journal` maps to the existing Dashboard journal workspace instead of introducing a duplicate UI.
- `/admin` maps to canonical `/superadmin`; the existing admin access check is preserved.
- Route navigation uses an in-content skeleton and App Router error boundary instead of remounting a full-screen route loader.
- Journal, Feed and Profile now have compatibility module boundaries; they still render the unchanged legacy components.
- The floating add-trade action moved from mixed override CSS to exact component-level Tailwind classes.
- The AI launcher remains visually frozen in a separate parity stylesheet until its dedicated Tailwind migration.
- A successful production build completed after the App Router and compatibility-boundary changes.
- CI includes a UI parity scope guard, lint and production build.
- Existing legacy render paths remain as a temporary safety fallback for any route not yet migrated.

## Protected during the current phase

- Account/Profile cards
- Feed cards and composer
- Journal account cards, dashboard, trades and analytics layouts
- Sidebar and topbar geometry
- AI launcher component and its temporary parity stylesheet
- Remaining legacy workspace CSS files

## Next

1. Confirm the latest CSS migration build and UI parity guard.
2. Convert the AI launcher parity stylesheet to exact Tailwind classes.
3. Extract the first internal Journal subcomponent behind the compatibility boundary without changing rendered DOM.
4. Convert remaining legacy CSS page by page only after each parity check.
5. Add desktop/mobile visual regression captures before merging to `main`.
