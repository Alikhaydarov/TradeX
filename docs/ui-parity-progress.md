# App Router and Tailwind UI parity — completed

## Non-negotiable result

- The existing Tradox UI remains the visual source of truth; this work changes architecture and styling ownership, not the product design.
- Runtime UI styling is Tailwind-only. `src/app/globals.css` contains only Tailwind imports, theme tokens and the minimal base layer.
- No legacy UI stylesheet, CSS module or component stylesheet remains under `src/`.
- Home remains `/`; `/chat` remains a compatibility redirect to `/`.
- The full-screen workspace boot loader remains in the persistent root shell and does not remount during ordinary route navigation.

## App Router architecture

- Root layout renders a persistent App Router-only workspace shell.
- The legacy hidden-children renderer and route fallback shell were removed.
- Home, Accounts, Dashboard, Trades, Analytics, Calendar, Economic Calendar, Settings, Profile, Pricing, Community and Admin are real App Router pages.
- Trade detail, calendar month, economic-calendar month, username profile and Community detail/section routes are real pages.
- `/journal` maps to the existing Dashboard journal workspace.
- `/backtest` is a compatibility redirect to the existing Trades workspace because the previous product did not contain a separate backtest implementation.
- `/admin` maps to canonical `/superadmin` while preserving the existing admin access check.
- Shell, Journal, Calendar, Chat, Profile and Community navigation use `next/navigation`; manual `pushState`/`popstate` bridges were removed from the migrated runtime paths.

## Tailwind-only UI ownership

- Auth landing styling moved to a Tailwind class boundary with the original layout, gradients, platform preview, animations and breakpoints.
- Workspace shell, sidebar, topbar, cards, controls, dialogs, tables, responsive rules and Community layout are owned by Tailwind boundaries/classes.
- The floating add-trade action matches the final previous cascade: 3.45rem dark-green rounded action, original shadow, interaction states and responsive position.
- The AI launcher matches the final previous cascade: 3.1rem black launcher with the centered 1.15rem icon and original responsive position.
- Dashboard mobile layout moved from a CSS module to a component Tailwind contract.
- Journal width, Calendar width and duplicate KPI behavior moved to route/component Tailwind boundaries.
- Typography overrides moved to root Tailwind classes and DM Sans theme variables, including mono tabular numbers and MUI/Recharts inheritance.
- CI recursively rejects any runtime CSS file other than `src/app/globals.css` and rejects any additional CSS import.

## Component architecture

### Chat

- `chat/chat-page.tsx` owns data, realtime orchestration and App Router room navigation.
- `chat/chat-sidebar.tsx` owns the canonical sidebar export.
- `chat/message-list.tsx` owns message rendering.
- `chat/message-input.tsx` owns the canonical composer export.
- The former combined chat layout was removed.

### Profile

- `profile/profile-page.tsx` composes the feature.
- `profile/use-profile-controller.ts` owns API, state and side effects.
- `profile/profile-header.tsx`, `profile/profile-posts.tsx`, `profile/profile-achievements.tsx`, edit/achievement/connections dialogs and shared types are separate modules.
- The former Profile mega-component was removed.

### Journal

- Accounts and account cards moved to `journal/journal-account-list.tsx`.
- Trade review/editor moved to `journal/journal-trade-editor.tsx`.
- Accounts, Dashboard Stats, Trade List, Analytics and Calendar have separate lazy route modules.
- `journal-v2.tsx` remains the journal data/workspace orchestrator while extracted visual sections own their markup.

## Community architecture

- Rail 1 is the persistent global Tradox sidebar.
- `/community/[id]/*` adds CommunitySidebar as Rail 2 next to the global rail.
- Community content and Chat occupy the remaining main workspace.
- Desktop rail geometry and mobile behavior are preserved with Tailwind ownership.

## Loading, responsive and performance

- `PageSkeleton` is the shared Tailwind route/dynamic loading component.
- App Router error boundaries and in-content loading prevent a full-screen loader on every navigation.
- Heavy page sections use dynamic imports and route-specific modules.
- Existing responsive breakpoints, dialog limits, mobile dashboard sizing, table overflow and Community rails were migrated to Tailwind contracts.

## Validation

- Tailwind-only ownership guard is required in CI.
- ESLint is required in CI.
- Next.js production build is required in CI.
- Source, ownership, lint and build diagnostics are available through workflow artifacts.
- The acceptance gate is a green Tailwind guard, green ESLint and green Next.js production build on the same final branch commit.
- Browser screenshot comparison was not run because the connected Vercel account remains build-rate-limited; no claim of automated pixel-diff verification is made.
