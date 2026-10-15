# Tradoxy Workspace Design System

## Foundations

- Use CSS tokens from `apps/web/src/app/globals.css` instead of new surface colors: background `#050505`, secondary `#090909`, card `#0c0c0c`, elevated `#171717`, border `#242424`.
- Primary `#86efac` identifies positive results. Losses use the danger token. Actions use neutral white or outlined controls.
- The locally served Inter Variable font supports Latin and Cyrillic. Main product headings are 22–28 px, body copy 13–14 px, compact labels 10–12 px, and numeric summaries 23–27 px.
- Controls use a 6 px radius and repeated cards/tools use 8 px. Form fields are 45–48 px tall; mobile inputs use 16 px text to prevent browser zoom.
- `workspace.css` owns the shared shell, overview, calendar, public profile and auth composition. Existing journal forms continue using the same surface tokens.

## Responsive Layout

- Desktop uses a 248 px sidebar and one page scrollbar. The 65 px header contains account context, workspace search and the add-trade action.
- Below 1024 px the sidebar becomes a drawer, the account selector moves below the header, and a five-destination bottom navigation appears.
- Below 700 px the trade table becomes expandable trade rows with execution details. No desktop-width table is squeezed into the phone layout.
- Calendar totals remain visible at both sizes. Desktop adds weekly totals; phone cells use compact P&L labels and the active month is scrolled into view.
- The community discovery column appears only when enough horizontal space is available.
- Desktop auth has an interactive product preview. Its animation code is loaded only on desktop. Mobile renders the sign-in/registration form directly.

## Interaction And Data

- Native modal dialogs provide focus containment, Escape handling and focus restoration. Pending forms cannot be dismissed.
- Keep existing posts visible during refresh. Likes and follows update optimistically and revert on failure.
- Respect reduced motion. Use short transitions and avoid animating the whole workspace during navigation.
- Server identity reads use React's per-request cache. Account and profile bootstrap data are shared by the layout and pages, never cached globally across users.
- Account management updates the selected-account cookie and refreshes server data after a create/delete. Dashboard, journal and calendar read the selected account.
- A breakeven trade is closed, contributes to the win-rate denominator, and is neither a win nor a loss. Unknown outcomes are excluded. Run `pnpm --filter @tradoxy/web test:metrics` to verify these calculations.

## Verification

UI checks cover 320, 390, 768, 1440 and 1920 px widths, sign-in/sign-up, calendar, dashboard, social feed/profile, accounts and journal forms. Browser interaction checks use isolated fixture API responses. They validate rendering and client interactions; live OAuth, storage uploads, billing and database authorization require separate integration checks.
