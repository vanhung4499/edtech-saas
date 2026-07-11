# Tenancy and Data Scope

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | Active                                                             |
| Date       | 2026-07-06                                                         |
| Scope      | Tenant isolation model, runtime context, RLS, branch data scope    |
| Depends on | `01-system-architecture.md`, `03-backend-conventions.md`           |

## 1. Purpose

Tenant isolation is the contract every business table and use case inherits.
It must be implemented before the first business module, while only
`system_tenants` and `system_branches` exist — retrofitting it later is far more
expensive.

## 2. Tenancy Model

One PostgreSQL database, one shared schema, a `tenant_id` column on every
tenant-owned table.

Isolation is enforced at **two layers**, both always on:

- **Layer 1 — application context**: every query explicitly filters by the
  ambient tenant. This drives correctness, branch scoping, and index usage.
- **Layer 2 — Postgres Row-Level Security**: the database refuses to return or
  accept rows outside the bound tenant. This is the safety net: one forgotten
  `where tenant_id` must not become a data leak.

Database-per-tenant / schema-per-tenant are out of scope until a customer needs
physical isolation. Nothing below blocks that move.

## 3. Tenant vs Branch

| Axis        | Meaning                                                | Enforced by            |
| ----------- | ------------------------------------------------------ | ---------------------- |
| `tenant_id` | Hard security boundary between customers               | RLS + app filters      |
| `branch`    | Soft data scope inside one tenant, varies per user     | application RBAC only  |

Rules:

1. A cross-tenant read is a critical incident. A branch-scope mistake is an
   authorization bug. Treat them differently.
2. `role` (what you may do) and `data scope` (what data you see) stay separate.
3. RLS knows nothing about branches; branch scoping lives in queries.

## 4. Schema Conventions

Every tenant-owned table spreads the shared column helpers
(`apps/api/src/database/schema/columns.ts`):

```ts
export const tenantColumn = {
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id),
};

export const branchColumn = {
  branchId: uuid("branch_id").notNull().references(() => branchesTable.id),
};
```

Rules:

1. Every business table: `...tenantColumn`. Operational tables (class, room,
   enrollment, payment, expense): also `...branchColumn`.
2. Composite indexes lead with `tenant_id`, e.g. `(tenant_id, created_at)`.
3. Uniqueness is per tenant: `unique(tenant_id, code)`, never `unique(code)`.
4. Not tenant-scoped: `system_tenants` itself, migration metadata.

## 5. Layer 1: Tenant Context (AsyncLocalStorage)

Resolve the tenant once per request; carry it implicitly so services never pass
`tenantId` by hand. `AsyncLocalStorage` is chosen over request-scoped providers
because it costs nothing per request and works identically in the worker.

```ts
// apps/api/src/common/tenant/tenant-context.ts
export type TenantScope = {
  tenantId: string;
  userId: string | null;
  branchIds: string[] | "ALL";
  roles: string[];
};

export const TenantContext = {
  run<T>(scope: TenantScope, fn: () => T): T { /* storage.run */ },
  current(): TenantScope | undefined { /* storage.getStore */ },
  require(): TenantScope { /* throws if unset — fail closed */ },
  tenantId(): string { /* require().tenantId */ },
};
```

Request pipeline order:

```txt
requestIdMiddleware -> auth (verify token) -> tenantContextMiddleware -> handler
```

Rules:

1. `tenantId` comes only from a **verified** token claim. Never from a raw
   client header or query param.
2. A subdomain may select which tenant to authenticate against, but must match
   the token claim. Mismatch = reject.
3. A global `TenantGuard` rejects requests without context; tenant-less routes
   (health, login, provisioning, platform admin) opt out explicitly with a
   decorator. The default is guarded.

## 6. Layer 2: Row-Level Security

### 6.1 Roles

The app and worker connect as a dedicated role that is **not** superuser, **not**
the table owner, and has **no** `BYPASSRLS` — all three silently bypass RLS.
Migrations run as the owner via a separate URL.

```txt
DATABASE_URL          # edtech_app — runtime (api, worker)
DATABASE_MIGRATE_URL  # owner      — drizzle-kit migrate/studio, seed
```

### 6.2 Policy per table

drizzle-kit does not generate policies; add a custom SQL migration per
tenant-owned table using the shared helper:

```sql
alter table <table> enable row level security;
alter table <table> force  row level security;
create policy tenant_isolation on <table>
  using      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

`current_setting(..., true)` returns NULL when unset, so an unbound connection
sees zero rows and cannot write: fail closed. `with check` also blocks updates
that would move a row across tenants.

### 6.3 Binding the tenant per unit of work

Set the GUC transaction-locally — never session-level `SET`, which leaks across
pooled connections:

```ts
// apps/api/src/database/tenant.ts
export async function withTenant<T>(db: Db, tenantId: string, fn: (tx: TenantTx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
```

The API exposes it as a provider reading the ambient context:

```ts
@Injectable()
export class Database {
  run<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return withTenant(db, TenantContext.tenantId(), fn);
  }
}
```

This is the transaction boundary referenced in `03-backend-conventions.md`:
service layer for light modules, application layer for heavy modules.

Repositories still filter by tenant (and branch) explicitly — RLS is the
seatbelt, not the steering wheel.

## 7. Worker Propagation

Jobs run without an HTTP request, so tenant context travels in the payload.
Enforce via helpers, not memory:

- enqueue side: an `enqueue()` helper reads `TenantContext.require()` and
  attaches `{ tenantId, userId }` to every job
- worker side: re-establish `TenantContext` + `withTenant` before any DB access;
  a job without tenant context fails immediately

## 8. Data Scope (branch-level authorization)

Application-level, resolved at login/authorization time into
`TenantScope.branchIds`:

| Scope         | Meaning                                  |
| ------------- | ---------------------------------------- |
| tenant-wide   | `branchIds: "ALL"`                       |
| branch-set    | explicit list of branch ids              |
| single-branch | list of one                              |
| self          | rows attributable to the user (per module) |

Repositories apply branch filters from the ambient scope. Reporting queries must
respect the same scope.

## 9. Platform / Cross-Tenant Operations

Tenant provisioning, platform admin, and cross-tenant billing use a separate,
narrow, audited code path with an explicit platform db handle (owner role).
Never reach cross-tenant access by "just not setting" the GUC — that path is
fail-closed by design. Log every cross-tenant operation with actor and reason.

## 10. Mandatory Isolation Tests

Integration tests seed two tenants A and B, then assert:

1. Under `withTenant(A)`, an unfiltered `select` returns only A's rows.
2. Writing a row with B's `tenant_id` under A fails the `with check`.
3. A query with no tenant context returns zero rows / fails.
4. A job enqueued under A processes under A and cannot touch B.

These tests are non-negotiable and run in CI.

## 11. Rollout Checklist

1. Create `edtech_app` role; split `DATABASE_URL` / `DATABASE_MIGRATE_URL`;
   update `.env.example` + `server-env.ts`.
2. Add column helpers; make `system_branches.code` unique per tenant.
3. Custom migration enabling RLS on existing and future tenant-owned tables.
4. `TenantContext` + middleware + global `TenantGuard` + opt-out decorator.
5. `withTenant` + `Database` provider.
6. Worker `enqueue`/context wrappers.
7. Isolation test suite.
8. Auth layer that populates verified claims — designed in
   `09-auth-and-authorization.md`, implemented via `docs/plans/auth-rbac.md`.
