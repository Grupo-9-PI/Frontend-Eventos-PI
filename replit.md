# Organizador de Eventos Independientes

Frontend React para que organizadores independientes planifiquen eventos y gestionen su trabajo logístico diario.

## Run & Operate

- `pnpm --filter @workspace/organizador-eventos run dev` — run the React frontend
- `pnpm --filter @workspace/organizador-eventos run typecheck` — typecheck the frontend
- `pnpm --filter @workspace/organizador-eventos run build` — build the frontend
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter, TypeScript
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/organizador-eventos/` — event organizer frontend
- `.local/conversation-workspace/original-frontend/` — read-only reference copy of the supplied frontend
- `artifacts/api-server/`, `lib/api-spec/`, and `lib/db/` — shared scaffold components; do not extend them for the frontend-only Sprint 0–1 work

## Architecture decisions

- The current deliverable is frontend-only through Sprint 0–1; do not add API endpoints, database schema, or server logic.
- Demo data is local to the browser behind a repository boundary; future API communication should stay isolated from page components.
- Preserve the existing graphite, blue, amber, oxide, and sage palette rather than replacing the visual identity.
- Authentication belongs to a later sprint; do not add local credential handling.

## Product

Organizers can create and edit events with an initial logistics plan, review urgent and overdue tasks, reschedule planning, and see preparation progress. Sprint 0–1 work uses local demo persistence; API integration is a separate responsibility.

## User preferences

- Keep the existing palette and evolve the current design instead of replacing it.
- Use Spanish identifiers where clear and keep comments about the future API short and limited to its integration boundary.

## Gotchas

- Avoid mixing future API calls into visual components.
- Estimates are durations in hours, not clock-time values.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
