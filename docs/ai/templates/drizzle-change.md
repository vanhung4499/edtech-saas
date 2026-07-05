# Template: Drizzle Schema Change

Use when adding or changing persisted data.

## Steps

1. Identify the owning module.
2. Add or update Drizzle table definition.
3. Add or update repository methods.
4. Add mapper if the module is heavy.
5. Add migration.
6. Update seed data if demo/dev flows need it.
7. Run typecheck and relevant tests.

## Rules

- Every business table should carry `tenant_id`.
- Most operational tables should carry `branch_id`.
- Keep finance records separate: receivable, payment, invoice, expense, payable.
- Drizzle table definitions are not domain entities.
