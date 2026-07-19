# Design QA — compact account flow

- Reference: TradesPad free-account plan gate captured at desktop viewport.
- Implementation: TradeWay `/accounts` production deployment from commit `a8f3ad1`.
- Comparison artifact: `.codex-audit/account-compact-pass/08-side-by-side.png` in the shared workspace.

## Review

- Accounts page hierarchy is quieter: one title, one compact portfolio strip, compact cards, one add action.
- Removed the non-essential account-separation marketing panel and duplicate helper copy.
- Account cards retain the essential trader data: account identity, source, status, balance, P&L, trade count, and win rate.
- Add-account chooser presents manual and automatic paths without hiding the premium path.
- Free-plan automatic-account path uses the reference structure: three plan tabs, monthly/yearly selector, feature checklist, contextual message, and CTA.
- TradeWay billing names and prices remain aligned with the product's actual Free, Standard, and Pro plans.
- Keyboard semantics, dialog controls, loading state, and mobile single-column layout are preserved.
- ESLint, TypeScript, and production build passed.

final result: passed
