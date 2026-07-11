# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Required reading before coding

This is a docs-first, AI-assisted product build. Before implementing, read (per `AGENTS.md`):

1. `docs/ai/project-brief.md` — product scope and phase boundaries
2. `docs/technical/README.md` — technical source of truth index
3. `docs/technical/03-backend-conventions.md` — module/layer/naming/transaction rules
4. `docs/technical/02-module-boundaries.md` — what each module owns and may not own
5. `docs/technical/04-tenancy-and-data-scope.md` — tenant isolation contract (before touching any table or query)
6. The target module's README if one exists

`AGENTS.md` is the working contract for this repo; its Backend/Frontend/Verification rules apply to all changes.

## Commands

Root scripts run through Turborepo (`turbo <task>`) across all workspaces:

```bash
pnpm install          # install (pnpm 11, workspace protocol)
pnpm dev              # run all apps in watch mode
pnpm build            # build all workspaces (respects ^build dep order)
pnpm lint             # eslint across workspaces
pnpm typecheck        # tsc --noEmit across workspaces
pnpm test             # vitest run across workspaces
pnpm format           # prettier --write .
```

Local infra (Postgres 16 + Redis 7) must be up before running the API:

```bash
docker compose up -d
cp .env.example .env   # then edit as needed
```

Database (Drizzle) — root shortcuts filter to `@edtech/api`:

```bash
pnpm db:generate      # generate migration from schema changes
pnpm db:migrate       # apply migrations
pnpm db:studio        # Drizzle Studio
pnpm db:seed          # run src/database/seed.ts
```

Run one workspace/task directly with a filter, e.g.:

```bash
pnpm --filter @edtech/api test
pnpm --filter @edtech/api dev
```

Run a single test file or test by name (vitest):

```bash
pnpm --filter @edtech/api exec vitest run src/common/exceptions/app.exception.spec.ts
pnpm --filter @edtech/api exec vitest run -t "keeps business code, message, status, and data"
```

Tests are colocated `*.spec.ts` files and run with `--passWithNoTests`.

## Workspace layout

pnpm workspace + Turbo monorepo. `apps/api` depends on `packages/shared` via the `workspace:*` protocol and a TS path alias (`@edtech/shared` — see `tsconfig.base.json`; `apps/api/tsconfig.json` also declares a TS project reference to it so cross-package builds/typechecks work under plain `tsc`).

- `apps/api` — NestJS backend: HTTP server (`main.ts`) + BullMQ worker entrypoint (`worker.ts`). Jobs run in-process by default; `worker.ts` can run them as a separate process later without code changes. `src/database/` holds Drizzle schema, client, migrations, and seed (source of DB truth) — colocated here because `apps/api` is its only consumer; never import it from `apps/web`.
- `apps/web` — Next.js operator console (App Router, Tailwind, React Query, react-hook-form). App-level/shared components live in `apps/web/components/` (no separate UI package until a second frontend exists).
- `packages/shared` — framework-free cross-cutting logic (e.g. `Money`); must not import NestJS/Next.js/Drizzle. CommonJS (not ESM) — its only consumers are `apps/api` (CJS-only, NestJS decorator metadata) and `apps/web` (bundler-agnostic either way), so there's no benefit to ESM here; revisit only if this package is ever published outside the monorepo.

API runtime env lives in `apps/api/src/config/server-env.ts` (zod schema), wired via `ConfigModule.forRoot({ validate })` in `app.module.ts`.

## Architecture: modular monolith

The domain is split into modules with strict ownership. Read `docs/technical/02-module-boundaries.md` for the full map; the load-bearing rules:

- **Modules:** `system` (tenant/branch/user/role/person/audit — platform base), `admissions`, `academic`, `scheduling`, `finance`, `reporting`.
- **Light vs heavy shape:** light modules use `controller -> service -> repository`; heavy modules (`academic`, `scheduling`, `finance`) use `interfaces -> application -> domain -> infrastructure`. Only add domain modeling when a module has real lifecycle/rule/calculation weight.
- **Finance is separate on purpose:** keep finance out of academic participation, enrollment out of financial terms, and payment out of invoice. Finance owns all money records even when another module triggers them.
- **Boundary rules:** a module never writes another module's tables; cross-module access goes through service methods / query APIs / reporting views; `reporting` is downstream read-only.
- **Drizzle rows are persistence records, not domain entities.** Never name them `*Entity`, never return them as API responses, never let them cross a module boundary. Light modules may use rows directly in services; heavy modules map rows into domain objects/policies/calculators.

## API conventions (apps/api)

Wired globally in `src/main.ts`; details in `docs/technical/03-backend-conventions.md`:

- Global prefix `api` + URI versioning (`defaultVersion: "1"`) → phase-1 routes live under `/api/v1`. Health: `/api/v1/health`.
- OpenAPI: Swagger UI at `/api/docs`, JSON at `/api/openapi.json`. NestJS DTO classes are the source of truth for REST contracts — there is deliberately no shared request/response contracts package; the web app consumes generated types from OpenAPI.
- DTO naming: `*.request.ts` / `*.response.ts`, validated with `class-validator`, transformed with `class-transformer`. Common DTOs in `src/common/dto`.
- **Response shape:** success (2xx) responses are never wrapped — controllers return the DTO/business data directly, documented with plain `@ApiOkResponse({ type: ... })`. Never return Drizzle rows as the response. Only failures (4xx/5xx) go through an envelope.
- **`AppException`** for business errors: `throw new AppException(SomeErrorCode.X, data?)`, where `SomeErrorCode` is a module-local registry built with `defineErrorCodes({ ... })` (`src/common/exceptions/error-code.ts`) — never a TS `enum` (can't bundle status + message), never one global enum of all codes. The global `AppExceptionFilter` normalizes both `AppException` and built-in Nest exceptions into the same `{ code, message, data }` shape, and logs the full stack trace for any 5xx (`src/common/exceptions/app-exception.filter.ts`).
- **Trace ID:** every request has a `traceId` (reads `x-request-id` or generates one). Always on the `x-request-id` response header; also echoed in failure response bodies (not success bodies, which are unwrapped). A separate access-log middleware logs one line per request (method, path, status, duration, traceId).
- **Transactions:** open explicit Drizzle transactions at the service (light) / application (heavy) boundary — never in controllers. Keep them short; no slow external calls inside; publish events after commit.
- **Config:** never read `process.env` in feature modules. Add runtime env to `src/config/server-env.ts` (zod schema `ServerEnv`), read via `ConfigService<ServerEnv, true>`, and keep `.env.example` in sync. Env is loaded from repo root or app folder (`../../.env(.local)`, `./.env(.local)`).

## Product scope guard

Phase 1 is center management only (admissions basics, academic delivery, scheduling, finance, reporting basics, system foundation). Do **not** implement `study-abroad` or `labor-export` workflows yet — they are documented as future modules that will reuse `system` and `finance`.
