# Tradoxy 2.0

AI-assisted trading performance platform built as a pnpm monorepo.

## Applications

- `apps/web`: Next.js App Router product and dashboard
- `apps/api`: NestJS REST and Socket.IO API
- `apps/worker`: background jobs and broker synchronization

## Shared packages

- `packages/database`: Prisma schema and database client
- `packages/contracts`: shared schemas and API contracts
- `packages/ui`: design tokens and reusable UI primitives
- `packages/broker`: broker provider boundary and mock provider
- `packages/risk-engine`: deterministic trading risk calculations
- `packages/config`: shared TypeScript configuration

## Local development

1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. Run `pnpm install`.
4. Run `pnpm db:generate` and `pnpm db:migrate`.
5. Run `pnpm dev`.

Web runs on `http://localhost:3000`; API runs on `http://localhost:4000/api/v1`.

