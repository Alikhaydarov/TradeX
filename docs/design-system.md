# Tradoxy Workspace Design System

## Foundations

- The visual reference is the pre-rebuild Tradoxy source at `799b7c6`. Keep its original monogram, black workspace, Home/Profile-first navigation, and compact trading surfaces.
- Use CSS tokens from `apps/web/src/app/globals.css`: background `#000000`, secondary `#101010`, card `#0a0a0a`, elevated `#181818`, border `#202020`.
- Primary white identifies actions. Profit uses `--profit` (`#6ee7b7`); losses use `--danger`. Do not use the profit color for branding or navigation.
- The locally served Inter Variable font supports Latin and Cyrillic. Main product headings are 15-18 px, body copy 13-14 px, compact labels 10-12 px, and numeric summaries 24-30 px.
- Controls use a 6 px radius and repeated cards/tools use 8 px. Form fields are 45–48 px tall; mobile inputs use 16 px text to prevent browser zoom.
- `workspace.css` owns the shared shell, overview, calendar, public profile and auth composition. Existing journal forms continue using the same surface tokens.

## Responsive Layout

- Desktop uses the original 252 px inset sidebar, a framed content surface, and one page scrollbar. The 64 px header contains the page title, account context, search, trade action and icon-only P&L menu.
- Home and Profile come first; Dashboard, Calendar, Trades and Analytics follow under Workspace. Additional tools remain accessible through a collapsed group.
- Below 1024 px the sidebar becomes a drawer and account context appears below the header. Use the drawer for navigation rather than duplicate bottom tabs.
- Below 700 px the trade table becomes expandable trade rows with execution details. No desktop-width table is squeezed into the phone layout.
- Calendar totals remain visible at both sizes. Desktop adds weekly totals; phone cells use compact P&L labels and the active month is scrolled into view.
- Home uses the original centered feed with individually bordered post cards. Profile uses the same timeline surfaces.
- The public root restores the light Tradoxy introduction with the original laptop asset. Sign-in and registration use a centered black form at all sizes. `public-entry.css` owns this separate public composition.
- The dashboard places the weekly strip above the balance curve and a four-card metric grid. On phones these stack without fixed desktop widths.

## Interaction And Data

- Native modal dialogs provide focus containment, Escape handling and focus restoration. Pending forms cannot be dismissed.
- Keep existing posts visible during refresh. Likes and follows update optimistically and revert on failure.
- Respect reduced motion. Use short transitions and avoid animating the whole workspace during navigation.
- Server identity reads use React's per-request cache. Account and profile bootstrap data are shared by the layout and pages, never cached globally across users.
- Account management updates the selected-account cookie and refreshes server data after a create/delete. Dashboard, journal and calendar read the selected account.
- P&L display preferences use localStorage and a server-readable cookie so hidden balances stay hidden on refresh. Financial values go through `Money`; percentage results use the selected account's starting balance, and missing denominators show an em dash.
- A breakeven trade is closed, contributes to the win-rate denominator, and is neither a win nor a loss. Unknown outcomes are excluded. Run `pnpm --filter @tradoxy/web test:metrics` to verify these calculations.

## Verification

UI checks cover 320, 390, 768, 1440 and 1920 px widths, sign-in/sign-up, calendar, dashboard, social feed/profile, accounts and journal forms. Browser interaction checks use isolated fixture API responses. They validate rendering and client interactions; live OAuth, storage uploads, billing and database authorization require separate integration checks.
