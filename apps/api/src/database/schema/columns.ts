import { timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { branchesTable, tenantsTable } from "./system";

// UUIDv7 (time-ordered) generated app-side, not gen_random_uuid() (v4) —
// keeps insert locality without the enumeration risk of an auto-increment PK.
export function idColumn() {
  return uuid("id").primaryKey().$defaultFn(() => uuidv7());
}

export const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// Every business table spreads this. system_tenants itself is the one
// exception (04-tenancy-and-data-scope.md): it has no tenant_id.
export const tenantColumn = {
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
};

// Operational tables (class, room, enrollment, payment, expense) also spread this.
export const branchColumn = {
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branchesTable.id),
};
