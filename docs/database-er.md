# Database ER design

`User` owns `TradingAccount`, `Session`, `Notification`, `Evaluation`, and `CoachThread`.

`TradingAccount` owns `Trade`, `AccountSnapshot`, `RiskProfile`, optional encrypted `BrokerCredential`, and may be linked to `Evaluation`.

`Trade` owns screenshots and has a many-to-many relation with `Tag` through `TradeTag`.

`CoachThread` owns ordered `CoachMessage` records. AI output is stored as structured JSON so citations, tools and text remain reproducible.

`Achievement` is a catalog joined to users with `UserAchievement`. `AuditLog` is append-only and intentionally independent from user deletion.

Money uses fixed precision decimals. High-cardinality access paths have compound indexes aligned with account and time filters. Broker identifiers are unique per account to make synchronization idempotent.

