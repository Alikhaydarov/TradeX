# Architecture

Tradoxy 2.0 is a modular monolith with explicit extraction boundaries. This keeps transactions and deployments simple while allowing broker sync, AI, and notifications to scale independently.

## Runtime topology

- Next.js web app: UI, server rendering, route-level loading and metadata.
- NestJS API: REST `/api/v1`, WebSocket gateway, authorization and orchestration.
- Worker: BullMQ consumers for broker sync, analytics materialization, AI jobs, email and notifications.
- PostgreSQL: normalized source of truth. Derived analytics are reproducible.
- Redis: queues, rate limits, short-lived cache and websocket fan-out.
- Object storage: trade screenshots, certificates and exports.

## Dependency rule

UI depends on contracts, never database internals. API modules depend on application services and repository interfaces. Broker and AI providers implement ports. Risk calculations remain pure and deterministic.

## Security baseline

- Short-lived access tokens and rotating refresh sessions.
- Argon2id passwords, server-side authorization, encrypted broker credentials.
- Idempotency keys for imports and billing webhooks.
- Validation at every transport boundary and audit logs for privileged mutations.
- Least-privilege database user and no service credentials in browser bundles.

