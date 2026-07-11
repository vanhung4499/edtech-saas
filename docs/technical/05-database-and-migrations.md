# Database and Migrations

| Field      | Value                                                       |
| ---------- | ------------------------------------------------------------ |
| Status     | Active                                                       |
| Date       | 2026-07-06                                                   |
| Scope      | Drizzle schema conventions, migration workflow, query rules  |
| Depends on | `02-module-boundaries.md`, `04-tenancy-and-data-scope.md`    |

## 1. Role of Drizzle

Drizzle is the persistence and query layer. Tables are persistence schema; rows
are persistence records. Neither is a domain entity — that separation is the
main reason Drizzle was chosen over Prisma.

All schema lives in `apps/api/src/database/schema/` — colocated with the only
app that touches the database directly; `apps/web` never defines tables or
queries the database.

## 2. Table Conventions

Naming: `<module>_<plural>` — `system_tenants`, `academic_enrollments`,
`finance_receivables`, `scheduling_rooms`. The prefix makes module ownership
visible in SQL and enforceable in review.

Every table:

```ts
export const enrollmentsTable = pgTable(
  "academic_enrollments",
  {
    id: idColumn(),            // UUIDv7, see schema/columns.ts
    ...tenantColumn,          // every business table
    ...branchColumn,          // operational tables
    // domain columns...
    ...timestampColumns,      // created_at / updated_at, timestamptz
  },
  (t) => ({
    tenantCreatedIdx: index("academic_enrollments_tenant_created_idx")
      .on(t.tenantId, t.createdAt),
  }),
);

export type EnrollmentRow = typeof enrollmentsTable.$inferSelect;
export type NewEnrollmentRow = typeof enrollmentsTable.$inferInsert;
```

Rules:

1. `id: idColumn()` (`schema/columns.ts`) — UUIDv7, generated app-side via
   `$defaultFn`, not Postgres's `gen_random_uuid()` (UUIDv4): UUIDv7 keeps
   B-tree insert locality (time-ordered) without the enumeration risk an
   auto-increment PK would have on a multi-tenant table.
2. Timestamps are `timestamptz`; every table has `created_at` / `updated_at`.
3. Tenant/branch/index/unique rules come from `04-tenancy-and-data-scope.md`
   (indexes lead with `tenant_id`; uniques are per tenant).
4. Money columns are `bigint` integer VND (`06-finance.md`). Never `numeric`
   floats, never `real`/`double`.
5. Status/lifecycle columns use Postgres enums or constrained `text` with a
   documented value set — pick per table, but list values in the table file.
   Master-data tables also carry `softDeleteColumn` (`deleted_at`); their
   per-tenant uniques are partial (`where deleted_at is null`). Fact/money
   tables are append-only with no `deleted_at`. Full rules in
   `10-cross-cutting-conventions.md`.
6. Schema files are organized per module: `schema/system.ts`, `schema/academic.ts`,
   etc., re-exported from `schema/index.ts`.
7. Cross-module foreign keys: allowed toward `system` ids. `finance` money
   records carry **no structural FK into product-module tables** — they reference
   their origin through the charge basis (`06-finance.md`). Other cross-module
   reads go through service APIs, and a module's tables are written only by that
   module.

## 3. Migration Workflow

```bash
pnpm db:generate    # drizzle-kit generate — after schema changes
pnpm db:migrate     # apply, runs as owner (DATABASE_MIGRATE_URL)
pnpm db:studio      # inspect
pnpm db:seed        # apps/api/src/database/seed.ts
```

Rules:

1. Never edit an applied migration; add a new one.
2. RLS policies, roles, and other non-schema DDL go in **custom SQL migrations**
   (drizzle-kit does not generate them). Every new tenant-owned table's migration
   must include its RLS policy — treat a table without a policy as a failing
   review.
3. Migrations must be runnable from zero (fresh clone -> `db:migrate` ->
   `db:seed` -> working app).
4. Seed data is development-only convenience; production provisioning is a
   product feature (`system`), not a seed script.

## 4. Query Rules

1. All tenant work runs inside the tenant-bound unit of work
   (`Database.run` / `withTenant`) so RLS is active.
2. Repositories still filter explicitly: `where eq(t.tenantId, ...)` plus branch
   scope. RLS is the safety net, not the query plan.
3. Prefer Drizzle query builder; drop to explicit SQL (`sql\`...\``) freely for:
   - reporting aggregations
   - finance calculations and reconciliation
   - performance-sensitive reads
4. N+1 discipline: batch with `inArray`, joins, or dedicated read queries.
   Reporting may add denormalized read models later — as explicitly downstream
   projections, never as a second source of truth.

## 5. Row Type Discipline

- `*Row` / `New*Row` types stay inside the owning module's repository layer
  (light modules may use them in services).
- Rows never cross module boundaries and never appear in API responses.
- Heavy modules convert rows to domain objects at the repository edge via
  `*Mapper` files.
