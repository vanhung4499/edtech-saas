import { boolean, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "./columns";

// Not tenant-scoped (04-tenancy-and-data-scope.md): the tenant table itself
// has no tenant_id, so it doesn't spread tenantColumn.
export const tenantsTable = pgTable("system_tenants", {
  id: idColumn(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestampColumns,
});

// Defines tenantsTable's own tenant_id FK inline (not via the shared
// tenantColumn helper) — columns.ts imports tenantsTable/branchesTable from
// here to build that helper for other modules, so this file must not import
// it back to avoid a needless cycle.
export const branchesTable = pgTable(
  "system_branches",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenantsTable.id),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => ({
    tenantCodeUnique: unique("system_branches_tenant_id_code_unique").on(t.tenantId, t.code),
    tenantCreatedIdx: index("system_branches_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

export type TenantRow = typeof tenantsTable.$inferSelect;
export type NewTenantRow = typeof tenantsTable.$inferInsert;
export type BranchRow = typeof branchesTable.$inferSelect;
export type NewBranchRow = typeof branchesTable.$inferInsert;
