# Design QA — plan-aware account connectors

- Source state: supplied `Add Account`, step 2 platform-selector screenshot.
- Implementation state: deployed `Add Account`, step 2 on a Pro account.
- Comparison: `.codex-audit/plan-connectors/comparison-1000x975.png`.
- Responsive evidence: desktop and 390 × 844 screenshots in `.codex-audit/plan-connectors/`.

## Findings and resolution

- P1 — seven equal-weight cards made unavailable connectors look actionable. Resolved by removing TradeLocker, cTrader, and MatchTrader until their connectors ship.
- P1 — the modal required excessive scrolling and repeated the connector explanation. Resolved with a 780px desktop modal, compact header, one plan summary, and no search for a four-item list.
- P1 — mobile cards were too wide and dense. Resolved with a bottom-sheet layout, single-column cards, shorter copy, safe viewport height, and internal scrolling.
- P2 — plan entitlement was unclear. Resolved with an explicit Active Standard/Pro summary and account-limit copy; Free users continue into the Free/Standard/Pro comparison gate.
- P2 — automatic sync and file imports had equal hierarchy. Resolved by featuring MT5 as the primary live connector and grouping CSV imports separately.
- P2 — trust information was repeated inside cards. Resolved with one read-only-access note below all connector choices.
- Interaction check: MT5 advances to setup step 3 and Back returns to the platform selector.
- Browser console: no errors during the tested flow.
- Static verification: ESLint, TypeScript, and production build passed.

final result: passed
