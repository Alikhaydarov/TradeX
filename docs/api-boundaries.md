# API module boundaries

- `auth`: registration, login, session rotation, password recovery.
- `users`: profile, preferences, locale and plan reads.
- `accounts`: account lifecycle and selected account state.
- `brokers`: provider credentials, connection tests and sync dispatch.
- `trades`: manual CRUD, import idempotency, screenshots and tags.
- `analytics`: read models and time-series aggregations.
- `risk`: risk profiles, deterministic checks and breach events.
- `evaluations`: challenge rules, progress and outcomes.
- `coach`: AI conversations, provider abstraction and tool execution.
- `training`: lessons, exercises and completion.
- `gamification`: achievements, rewards, league and leaderboard.
- `notifications`: inbox, preferences and realtime delivery.
- `billing`: plans, entitlements and provider webhooks.
- `admin`: privileged user/plan/system operations and audit access.

Modules communicate through exported application services or durable domain events, never cross-module table access from controllers.

