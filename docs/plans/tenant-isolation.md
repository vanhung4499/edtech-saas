# Plan: Tenant Isolation Implementation

| Field      | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| Status     | Ready to implement                                           |
| Date       | 2026-07-06                                                   |
| Scope      | Implement `docs/technical/04-tenancy-and-data-scope.md`      |
| Depends on | `docs/technical/04-tenancy-and-data-scope.md`, `05-database-and-migrations.md` |
| Out of scope | Auth (login/tokens), RBAC/data-scope resolution, business modules |

## 1. Goal

Make the two-layer tenant isolation (app context + RLS) real and proven by tests,
before any business module lands.

Done means: a two-tenant isolation test suite passes in CI against a real
Postgres, and every future tenant-owned table only needs to follow the
established pattern.

## 2. Current State (what this plan builds on)

- `apps/api/src/database`: `client.ts`, `schema/system.ts` (`system_tenants`,
  `system_branches`), `schema/columns.ts` (`idColumn`, `timestampColumns`,
  `tenantColumn`, `branchColumn`), `tenant-rls.ts` (`enableTenantRls(table)`),
  `tenant.ts` (`withTenant(db, tenantId, fn)` + `TenantTx`). Four migrations:
  `0000_bootstrap_app_role`, `0001_system_tenants_and_branches`,
  `0002_enable_rls_system_tables`, `0003_fix_rls_pooled_connection_guc_revert`
  (bug found while verifying step 4 — see below). Steps 1–4 done, verified
  against a real local Postgres: fresh `docker compose up -d` +
  `pnpm db:migrate` (owner) + `pnpm db:seed` (owner) all work; `edtech_app`
  can `select`/`insert`/`update`/`delete` but a `create table` fails with
  `permission denied for schema public`; RLS fail-closed/scoped/fail-closed
  confirmed for no-GUC / correct-GUC / wrong-GUC; `withTenant` verified to set
  the GUC inside its transaction and leave it unset (post-fix) outside it,
  including on a reused pooled connection, and two sequential `withTenant`
  calls on the same pool don't leak between each other.
- **Bug found and fixed**: `current_setting('app.tenant_id', true)` returns
  NULL on a connection that's never touched the GUC, but on a pooled
  connection that has (even transactionally, even after
  commit/rollback), it reverts to `''`, not NULL — `''::uuid` throws instead
  of degrading to zero rows. Fixed with `nullif(current_setting(...), '')`
  in both `tenant-rls.ts` and `04-tenancy-and-data-scope.md` §6.2's template,
  applied via `0003_fix_rls_pooled_connection_guc_revert`. This would have
  been caught by step 7's pool-reuse test either way, but surfaced naturally
  while building step 4.
- `apps/api`: pipeline wired in `main.ts`
  (result/exception/validation/traceId/tenantContext), `AppModule` has
  `ConfigModule` + `DatabaseModule` (global) + health, global `TenantGuard` via
  `APP_GUARD`. `common/tenant/` has `tenant-context.ts` (AsyncLocalStorage),
  `tenant-context.middleware.ts` (reads `req.auth` — always empty until auth
  exists, so it's a pass-through for now), `tenant.guard.ts` +
  `public.decorator.ts`, `tenant.errors.ts`. `common/database/` has
  `db.provider.ts` + `database.service.ts` (`Database.run(fn)` =
  `withTenant(db, TenantContext.tenantId(), fn)`) + `database.module.ts`.
  Step 5 done, verified against a real running api process (`edtech_app`
  connection): `GET /api/v1/health` (`@Public()`) still 200s; a temporary
  guarded route with no tenant context returned `401 TENANT_CONTEXT_REQUIRED`;
  a temporary route manually calling `TenantContext.run(scope, () =>
  database.run(...))` round-tripped a real RLS-scoped query end to end through
  the whole HTTP pipeline.
- worker runs as an `apps/api` entrypoint (`worker.ts`), in-process by default; no queue processing yet.
- Remaining gap vs design: no worker tenant-context propagation yet (Step 6);
  no auth, so `tenant-context.middleware.ts` never actually populates context
  on a real request yet — that lands with auth (next plan).

## 3. Work Breakdown

Steps are ordered; each has its own commit and done-check. Steps 1–3 touch
`apps/api/src/database` only; 4–5 touch the rest of `apps/api`; 6 is worker; 7 is tests.

### Step 1: Database roles + env split

- Add `apps/api/src/database/scripts/bootstrap-roles.sql`: create `edtech_app`
  (login, `nosuperuser`, `nobypassrls`), grants + default privileges as in the
  design doc.
- Mount it in `docker-compose.yml` under `/docker-entrypoint-initdb.d/` so a
  fresh local Postgres gets the role automatically. Document the manual step for
  non-fresh volumes (`psql -f`), and for production.
- Env split:
  - `DATABASE_URL` -> `edtech_app` (runtime: api, worker, isolation tests)
  - `DATABASE_MIGRATE_URL` -> owner `edtech` (drizzle-kit generate/migrate/studio, seed)
- Update: `drizzle.config.ts` and `seed.ts` to use `DATABASE_MIGRATE_URL`;
  `apps/api/src/config/server-env.ts` (add `DATABASE_MIGRATE_URL` optional at
  runtime); `.env.example`.

Done: fresh `docker compose up -d` + `pnpm db:migrate` + `pnpm db:seed` works;
`psql` as `edtech_app` can select but is not owner.

### Step 2: Schema helpers + branch unique fix

- Add `apps/api/src/database/schema/columns.ts`: `tenantColumn`, `branchColumn`,
  `timestampColumns` (per design doc).
- Refactor `schema/system.ts` to use the helpers.
- Change `system_branches`: drop global `unique(code)`, add
  `unique(tenant_id, code)` and index `(tenant_id, created_at)`.
- `pnpm db:generate` for the migration.

Done: migration applies from zero; two tenants can share a branch code.

### Step 3: RLS enablement

- Add `apps/api/src/database/tenant-rls.ts`: `enableTenantRls(table)` SQL helper
  (enable + force + `tenant_isolation` policy on `tenant_id`).
- Custom SQL migration:
  - `system_branches`: standard tenant policy.
  - `system_tenants` (special case — it has no `tenant_id`): enable + force RLS
    with policy `using (id = current_setting('app.tenant_id', true)::uuid)` so a
    bound connection sees only its own tenant row. Cross-tenant listing is a
    platform operation (owner role).
- Convention going forward (already in `05-database-and-migrations.md`): every
  migration creating a tenant-owned table includes its policy in the same
  migration.

Done: as `edtech_app` without the GUC, `select * from system_branches` returns
zero rows; with `set_config` it returns only that tenant's rows.

### Step 4: Tenant unit of work in `apps/api/src/database`

- Add `apps/api/src/database/tenant.ts`: `withTenant(db, tenantId, fn)` opening a
  transaction and setting `app.tenant_id` via `set_config(..., true)` (design doc
  section 6.3). Export `TenantTx` type.
- Export from `src/index.ts`.

Done: unit-level check that the GUC is set inside and absent outside the
transaction (covered properly in step 7).

### Step 5: API tenant context + wiring

New files under `apps/api/src/common/tenant/`:

- `tenant-context.ts` — `TenantScope`, `TenantContext` (AsyncLocalStorage;
  `run/current/require/tenantId`).
- `tenant-context.middleware.ts` — builds scope from `req.auth` (verified
  claims). Until auth exists, `req.auth` is simply never set; the middleware
  passes through. **No dev header fallback** — the design doc forbids raw-header
  tenant ids, and a temporary one would outlive its welcome.
- `tenant.guard.ts` + `public.decorator.ts` — global guard, fail closed;
  `@Public()` on health (and future login/provisioning).

New files under `apps/api/src/common/database/`:

- `db.provider.ts` — singleton `Db` from `createDatabaseClient(DATABASE_URL)`
  via `ConfigService`, exposed as a Nest provider in a global `DatabaseModule`.
- `database.service.ts` — `Database.run(fn)` = `withTenant(db, TenantContext.tenantId(), fn)`.

Wiring: register middleware order in `main.ts`
(`requestId -> tenantContext`), global guard via `APP_GUARD`, import
`DatabaseModule` in `AppModule`.

Done: `/api/v1/health` still works (public); any new guarded route without
context gets `401 TENANT_CONTEXT_REQUIRED`; api boots with db connected.

### Step 6: Worker context propagation (minimal now)

- Add a `tenant-job.ts` helper in `apps/api` (worker side): `runTenantJob(jobData, handler)`
  — reads `__ctx.tenantId`, fails closed if missing, wraps handler in
  `TenantContext.run` + `withTenant`. Worker and HTTP share the same
  `TenantContext` since they are the same app.
- The producing-side `enqueue()` helper lands in the api when the api first
  gains a BullMQ producer (no queue producers exist yet). Record that rule here
  so `queue.add` never gets called directly for tenant work.

Done: worker skeleton compiles with the wrapper in place; rule documented.

### Step 7: Isolation test suite (the point of the whole plan)

`apps/api/src/database/tenant-isolation.spec.ts` (vitest, integration — needs
Postgres from docker compose; connects as `edtech_app` via `DATABASE_URL`,
seeds via `DATABASE_MIGRATE_URL`):

1. Seed tenants A and B, each with branches.
2. `withTenant(A)`: unfiltered select on `system_branches` returns only A rows.
3. `withTenant(A)`: insert branch with `tenant_id = B` -> fails (`with check`).
4. No context (plain `db`): select returns zero rows; insert fails.
5. `withTenant(A)` on `system_tenants`: sees only its own row.
6. Two sequential `withTenant` calls on the same pool (A then B) never leak the
   previous GUC (pool-reuse regression test).

CI: add a workflow step with Postgres service + role bootstrap + migrate before
tests (part of the "CI running typecheck/lint/test" foundation task).

Done: suite green locally and in CI; this suite becomes the permanent regression
gate for every future tenant-owned table.

## 4. Acceptance Criteria (whole plan)

- [ ] Fresh clone: `docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm test` all green.
- [ ] Runtime connects as `edtech_app`; migrations as owner; verified by test 4 above.
- [ ] All isolation tests in step 7 pass in CI.
- [ ] `system_branches.code` unique per tenant.
- [ ] Health route public; guard default-on for everything else.
- [ ] `.env.example`, `server-env.ts`, and technical docs match the final implementation.

## 5. Risks / Decisions Taken

- **`system_tenants` RLS via own-row policy** — decided above; platform listing
  goes through the owner-role path.
- **Existing local volumes won't get the new role** from compose init; the plan
  documents the manual `psql` step. Simplest reset: `docker compose down -v`.
- **No auth yet** means no end-to-end HTTP test of a tenant-scoped route; the
  suite tests the database contract directly. The first `system` route lands
  together with auth (next plan) and reuses this foundation.
- **Drizzle transaction nesting**: `withTenant` opens the transaction; nested
  `db.transaction` inside handlers is disallowed by convention (design doc rule)
  — repositories receive `TenantTx`.

## 6. Suggested Commit Sequence

1. `feat(db): split runtime/migration roles and bootstrap edtech_app`
2. `feat(db): tenant/branch column helpers, per-tenant branch code unique`
3. `feat(db): enable RLS on system tables with tenant policies`
4. `feat(db): withTenant tenant-bound unit of work`
5. `feat(api): tenant context, guard, database provider wiring`
6. `feat(worker): tenant job context wrapper`
7. `test(db): tenant isolation integration suite + CI`
