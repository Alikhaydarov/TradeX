# Design QA — unified plan-aware Add Account

- Source states: supplied TradesPad Add Account screenshots for account type, platform selection, and Free-plan locked automatic flow.
- Implementation: one three-step wizard shared by Free, Standard, and Pro.

## Verified behavior

- Step 1 uses the same Manual and Automatic cards for every plan.
- Free Manual advances to the account form.
- Free Automatic advances to the same platform grid, keeps its visual context visible, and applies a blur/lock overlay with Back and Compare plans actions.
- Standard and Pro use the same searchable grid; plan entitlement is shown in one compact summary.
- MetaTrader 5 is the only live connector. Unsupported connectors are visibly disabled and marked Coming soon.
- The grid is four columns at desktop modal widths, three at tablet widths, and two on mobile.
- Modal content scrolls inside the viewport and the final-step actions remain sticky.
- Static verification: ESLint, TypeScript, and the production build pass.

final result: passed
