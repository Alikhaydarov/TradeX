# UI-Preserving App Router Migration

## Non-negotiable rules

1. Existing production UI is the visual source of truth. Card geometry, spacing, typography, sidebar, topbar, floating add-trade button, AI launcher, responsive behavior and Onyx theme must remain visually identical.
2. `/` remains the Home/Feed route. It must never redirect to `/chat`.
3. Route changes must not show a full-screen boot spinner. `WorkspaceBootLoader` is initial-authenticated-workspace boot only; route-level `loading.tsx` files must use local skeletons or be omitted.
4. App Router migration is incremental. Existing screen components are reused before they are split. Refactoring must not redesign them.
5. Tailwind conversion is in-place and screenshot-verified. Removing an override is allowed only after its computed visual result is reproduced with component-level Tailwind classes.
6. Every phase must pass build and responsive checks before the next phase begins.

## Migration phases

### Phase 1 — App Router navigation, zero visual changes
- Keep the existing AppShell DOM and class names.
- Replace manual `window.history.pushState/replaceState` navigation with `useRouter().push/replace`.
- Keep `usePathname()` as the route-to-section source of truth.
- Do not add route-level full-screen loaders.

### Phase 2 — Route views, same components
- Extract the existing `renderSection` mapping into reusable route view components.
- Make each `page.tsx` render the same existing screen component.
- Keep the exact workspace shell markup and providers.
- Keep `/` mapped to Feed/Home.

### Phase 3 — Persistent workspace layout
- Move the unchanged shell markup into an App Router workspace layout.
- Preserve the exact sidebar spacer, topbar placement, scroll container and floating controls.
- Confirm that navigating between pages does not remount the boot loader.

### Phase 4 — Component splitting without redesign
- Split Journal, Feed, Chat and Profile by responsibility.
- Preserve existing props, markup order, class names and behavior first.
- Optimize data hooks only after visual parity is confirmed.

### Phase 5 — Tailwind conversion with visual parity
- Convert one component/override group at a time.
- Record desktop and mobile screenshots before and after.
- Remove CSS override files only when the rendered result is 1:1.

## Required verification

- `/` opens Home/Feed and URL remains `/`.
- Sidebar navigation uses Next.js router without page reload.
- No full-screen spinner appears during normal route changes.
- Accounts cards and menus are unchanged.
- Floating `+` and AI buttons are unchanged.
- Desktop and mobile layouts match the baseline before each merge.
