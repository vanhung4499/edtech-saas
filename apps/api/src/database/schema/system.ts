import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { branchColumn, idColumn, tenantColumn, timestampColumns } from "./columns";

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
// tenantColumn helper): columns.ts imports tenantsTable/branchesTable from
// here to build tenantColumn/branchColumn for every table (including the
// other ones below) — this one specific FK must stay inline to keep that
// cycle resolvable (verified empirically, not just by type-checking).
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

export const userStatusEnum = pgEnum("system_user_status", ["ACTIVE", "DISABLED"]);
export const dataScopeTypeEnum = pgEnum("system_data_scope_type", ["TENANT", "BRANCH_SET", "SELF"]);
export const loginOutcomeEnum = pgEnum("system_login_outcome", [
  "SUCCESS",
  "BAD_PASSWORD",
  "LOCKED",
  "DISABLED",
]);

export const usersTable = pgTable(
  "system_users",
  {
    id: idColumn(),
    ...tenantColumn,
    // Nullable, no FK yet: Person module doesn't exist. A user is not a
    // person (09-auth-and-authorization.md §3.1) — this column reserves the
    // link for when the person module lands, without blocking auth on it.
    personId: uuid("person_id"),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    dataScopeType: dataScopeTypeEnum("data_scope_type").notNull().default("TENANT"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (t) => ({
    tenantEmailUnique: unique("system_users_tenant_id_email_unique").on(t.tenantId, t.email),
    tenantCreatedIdx: index("system_users_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

export const rolesTable = pgTable(
  "system_roles",
  {
    id: idColumn(),
    ...tenantColumn,
    code: text("code").notNull(),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    ...timestampColumns,
  },
  (t) => ({
    tenantCodeUnique: unique("system_roles_tenant_id_code_unique").on(t.tenantId, t.code),
    tenantCreatedIdx: index("system_roles_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

export const rolePermissionsTable = pgTable(
  "system_role_permissions",
  {
    id: idColumn(),
    ...tenantColumn,
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id),
    // Permission keys are a code registry (09-auth-and-authorization.md §4.2),
    // not a foreign key — nothing in the DB validates this string.
    permissionKey: text("permission_key").notNull(),
    ...timestampColumns,
  },
  (t) => ({
    roleKeyUnique: unique("system_role_permissions_role_id_permission_key_unique").on(
      t.roleId,
      t.permissionKey,
    ),
    tenantCreatedIdx: index("system_role_permissions_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

export const userRolesTable = pgTable(
  "system_user_roles",
  {
    id: idColumn(),
    ...tenantColumn,
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id),
    ...timestampColumns,
  },
  (t) => ({
    userRoleUnique: unique("system_user_roles_user_id_role_id_unique").on(t.userId, t.roleId),
    tenantCreatedIdx: index("system_user_roles_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

// Rows only exist for BRANCH_SET-scoped users (09-auth-and-authorization.md §4.3).
export const userBranchesTable = pgTable(
  "system_user_branches",
  {
    id: idColumn(),
    ...tenantColumn,
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    ...branchColumn,
    ...timestampColumns,
  },
  (t) => ({
    userBranchUnique: unique("system_user_branches_user_id_branch_id_unique").on(
      t.userId,
      t.branchId,
    ),
    tenantCreatedIdx: index("system_user_branches_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

// "Entitlement" (not "tenant module"): a commercial/platform fact about what
// the tenant bought, not something a tenant admin can self-service — see
// 09-auth-and-authorization.md §5 (platform provisioning sets this) vs §7
// (platform ops don't use tenant RBAC). "module" stays in the name on
// purpose: this table is only ever about module-level access, not a general
// entitlement store.
export const moduleEntitlementsTable = pgTable(
  "system_module_entitlements",
  {
    id: idColumn(),
    ...tenantColumn,
    moduleKey: text("module_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    ...timestampColumns,
  },
  (t) => ({
    tenantModuleUnique: unique("system_module_entitlements_tenant_id_module_key_unique").on(
      t.tenantId,
      t.moduleKey,
    ),
  }),
);

// Append-only (09-auth-and-authorization.md §3.5): no update path in code, so
// no updatedAt — nothing would ever write to it.
export const loginLogsTable = pgTable(
  "system_login_logs",
  {
    id: idColumn(),
    ...tenantColumn,
    // Nullable: an unknown email has no user row to attribute the attempt to.
    userId: uuid("user_id").references(() => usersTable.id),
    attemptedEmail: text("attempted_email").notNull(),
    ip: text("ip").notNull(),
    userAgent: text("user_agent").notNull(),
    outcome: loginOutcomeEnum("outcome").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCreatedIdx: index("system_login_logs_tenant_created_idx").on(t.tenantId, t.createdAt),
  }),
);

// No tenant_id, no tenant RLS — platform path only, owner-role db handle
// (09-auth-and-authorization.md §7). edtech_app's access is explicitly
// revoked in the same migration that creates this table (0000's default
// privileges would otherwise grant it DML on every future table blindly).
export const platformAdminsTable = pgTable("platform_admins", {
  id: idColumn(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  ...timestampColumns,
});

export type UserRow = typeof usersTable.$inferSelect;
export type NewUserRow = typeof usersTable.$inferInsert;
export type RoleRow = typeof rolesTable.$inferSelect;
export type NewRoleRow = typeof rolesTable.$inferInsert;
export type RolePermissionRow = typeof rolePermissionsTable.$inferSelect;
export type NewRolePermissionRow = typeof rolePermissionsTable.$inferInsert;
export type UserRoleRow = typeof userRolesTable.$inferSelect;
export type NewUserRoleRow = typeof userRolesTable.$inferInsert;
export type UserBranchRow = typeof userBranchesTable.$inferSelect;
export type NewUserBranchRow = typeof userBranchesTable.$inferInsert;
export type ModuleEntitlementRow = typeof moduleEntitlementsTable.$inferSelect;
export type NewModuleEntitlementRow = typeof moduleEntitlementsTable.$inferInsert;
export type LoginLogRow = typeof loginLogsTable.$inferSelect;
export type NewLoginLogRow = typeof loginLogsTable.$inferInsert;
export type PlatformAdminRow = typeof platformAdminsTable.$inferSelect;
export type NewPlatformAdminRow = typeof platformAdminsTable.$inferInsert;
