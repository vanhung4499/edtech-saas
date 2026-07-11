import { getTableName, type Table } from "drizzle-orm";

// Generates the RLS SQL for a standard tenant-owned table (04-tenancy-and-data-scope.md
// §6.2). Migrations are hand-written SQL — drizzle-kit never runs this at
// migrate time — so paste the output into the new table's own migration:
// every migration creating a tenant-owned table must include its policy in
// the same migration (05-database-and-migrations.md §3 rule 2).
export function enableTenantRls(table: Table): string {
  const name = getTableName(table);
  // nullif(..., '') matters under connection pooling: set_config(..., true)
  // reverts a transaction-local GUC to '' (not NULL) once the connection has
  // had it set at all, and ''::uuid throws instead of degrading to zero rows.
  const guc = `nullif(current_setting('app.tenant_id', true), '')::uuid`;

  return `alter table "${name}" enable row level security;
alter table "${name}" force row level security;
create policy tenant_isolation on "${name}"
  using (tenant_id = ${guc})
  with check (tenant_id = ${guc});`;
}
