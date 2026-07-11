// module:resource:action (09-auth-and-authorization.md §4.2). Permissions are
// product surface, not tenant data — code registry, not a DB table. Each
// module contributes its own list here; until other modules exist, this file
// is the whole registry (auth-rbac plan step 2).
export interface PermissionDefinition {
  key: string;
  description: string;
}

// The module segment of a permission key must be one of these — not the same
// list as "purchasable" tenant modules (system is always-on, never gated by
// entitlement, but user/role/branch management still needs permission keys).
export const KNOWN_MODULES = [
  "system",
  "admissions",
  "academic",
  "scheduling",
  "finance",
  "reporting",
] as const;

const systemPermissions = [
  {
    key: "system:user:manage",
    description: "Create users, disable/enable, set data scope and branches, assign roles",
  },
  { key: "system:user:read", description: "List and view users" },
  { key: "system:role:manage", description: "Create and edit roles, set their permissions" },
  { key: "system:role:read", description: "List and view roles" },
  { key: "system:branch:manage", description: "Create and edit branches" },
  { key: "system:branch:read", description: "List and view branches" },
  // Read-only on purpose: module entitlement is a platform/billing fact (what
  // the tenant bought), set during platform provisioning — not something a
  // tenant's own Owner can toggle via RBAC (09-auth-and-authorization.md §5,
  // §7). No "manage" key exists for this resource.
  { key: "system:module-entitlement:read", description: "View enabled tenant modules" },
] as const satisfies readonly PermissionDefinition[];

export const PERMISSIONS: readonly PermissionDefinition[] = systemPermissions;

export type PermissionKey = (typeof systemPermissions)[number]["key"];

// Valid role-permission assignment meaning "everything" (Owner role) — not a
// listed permission itself, so it's kept separate from PermissionKey.
export const WILDCARD_PERMISSION = "*";
