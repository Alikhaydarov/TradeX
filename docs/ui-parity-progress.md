# App Router migration with UI parity

## Non-negotiable constraints

- Preserve the current production UI one-to-one while architecture changes.
- Keep `/` as Home. `/chat` is only a compatibility redirect to `/`.
- Keep existing card markup, dimensions, spacing, sidebar geometry, topbar, floating add-trade action and AI launcher unchanged during routing migration.
- Keep the full-screen workspace boot loader mounted in the persistent root shell so it runs only on initial workspace boot, not on every route navigation.
- Do not remove legacy CSS override files until their visual output has been reproduced with Tailwind classes and verified page by page.

## Completed

- Root layout renders App Router `children` through a persistent UI-preserving workspace shell.
- Navigation uses `next/navigation` instead of manual history mutation in the new shell.
- Home, Accounts, Dashboard, Trades, Analytics, Calendar, Settings, Profile, Pricing and Community hub are real App Router pages.
- Trade detail, calendar month, username profile and Community detail/section routes are real App Router pages.
- `/journal` maps to the existing Dashboard journal workspace instead of introducing a duplicate UI.
- `/admin` maps to canonical `/superadmin`; the existing admin access check is preserved.
- Existing legacy render paths remain as a temporary safety fallback for any route not yet migrated.

## Next

1. Confirm lint and production build in GitHub Actions.
2. Add route-level error boundaries and non-blocking content skeletons without full-screen navigation loaders.
3. Split mega-components behind compatibility exports, preserving their rendered DOM and Tailwind classes.
4. Convert legacy CSS to Tailwind page by page only after parity verification.
5. Add desktop/mobile visual regression captures before merging to `main`.
