# Template: Drizzle Schema Change

Use when adding or changing persisted data.

## Steps

1. Identify the owning module; add or update the table in
   `packages/database/src/schema/<module>.ts` (apps never define tables).
2. Spread the shared column helpers: `tenantColumn` (every business table),
   `branchColumn` (operational tables), `softDeleteColumn` (master data),
   `timestampColumns`.
3. Indexes lead with `tenant_id`. Per-tenant uniques on master data are
   partial: `unique(tenant_id, code) where deleted_at is null`.
4. Column types: money = `bigint` integer VND; instants = `timestamptz`;
   recurring wall-clock schedules = day-of-week + `time`; pure dates = `date`.
5. Run `pnpm db:generate`. A new tenant-owned table gets its RLS policy
   (`enableTenantRls`) **in the same migration** — a table without a policy
   fails review.
6. Add or update repository methods in the owning module; mapper if heavy.
7. Update seed data if demo/dev flows need it.
8. Run typecheck and tests — tenant isolation tests must stay green.

## Rules

- Every business table carries `tenant_id`; most operational tables carry
  `branch_id`.
- Keep finance records separate: receivable, payment, allocation, invoice,
  expense, payable.
- Cross-module FKs only toward `system` ids; finance references business
  origins via the charge basis.
- Fact/money tables are append-only: no `deleted_at`, no updates to settled
  records — corrections are compensating records.
- Drizzle table definitions are not domain entities.
