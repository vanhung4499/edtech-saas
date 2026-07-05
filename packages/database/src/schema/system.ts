import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("system_tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branchesTable = pgTable("system_branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantsTable.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantRow = typeof tenantsTable.$inferSelect;
export type NewTenantRow = typeof tenantsTable.$inferInsert;
export type BranchRow = typeof branchesTable.$inferSelect;
export type NewBranchRow = typeof branchesTable.$inferInsert;
