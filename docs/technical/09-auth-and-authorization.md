# Auth and Authorization

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | Active                                                             |
| Date       | 2026-07-06                                                         |
| Scope      | Authentication, sessions, RBAC, data scope, module entitlement     |
| Depends on | `04-tenancy-and-data-scope.md`, `02-module-boundaries.md`          |

## 1. Purpose and Scope

This document defines how operators log in and how the system decides what they
may do and see. It is the producer of the verified claims that
`04-tenancy-and-data-scope.md` consumes (`req.auth` -> `TenantScope`).

Phase-1 scope: email + password login for the internal operator console.
Explicitly later: SSO/OAuth, 2FA, email-based password reset, API keys/mobile
tokens, parent portal auth.

## 2. Decisions

| Concern            | Decision                                                        |
| ------------------ | ---------------------------------------------------------------- |
| Authentication     | Server-side sessions in Redis + httpOnly signed cookie          |
| Password hashing   | argon2id                                                        |
| Authorization      | RBAC with code-defined permission keys + user-level data scope  |
| Module gating      | Tenant module entitlement, checked via the permission key prefix |
| Menu visibility    | Derived client-side from permissions (no DB-driven menus in v1) |

**Why sessions instead of JWT:** instant revocation (fire an employee, kill the
session now), no refresh-token rotation machinery, Redis is already in the
stack. The operator console is first-party; stateless verification buys nothing
here. Token-based auth can be added later for mobile/API without changing this
model.

## 3. Authentication

### 3.1 Login identity

- User accounts are tenant-scoped: `system_users` with `unique(tenant_id, email)`.
  The same email may exist in two tenants as two unrelated accounts.
- Login input: `tenantCode + email + password`. The tenant code is pre-filled by
  subdomain later (`acme.app` -> tenant `acme`); the resolved tenant must always
  match the account's tenant.
- `system_users.person_id` (nullable) links staff accounts to `Person` once the
  person module lands. A user is not a person (`docs/business` rule).

### 3.2 Sessions

- Store: Redis. Key `session:<id>` -> `{ userId, tenantId, createdAt, ip, userAgent }`.
  Sliding TTL 12h, absolute cap 7 days. A per-user index set
  `user-sessions:<tenantId>:<userId>` enables "log out everywhere".
- Cookie: `edtech_session`, httpOnly, `SameSite=Lax`, `Secure` in production,
  signed with `AUTH_SECRET`. Web (`app.domain`) and API (`api.domain`) are
  same-site, so Lax cookies flow on XHR while blocking cross-site POSTs (CSRF
  baseline); the API additionally rejects mutations whose `Origin` header does
  not match `APP_URL`.
- Session id is regenerated on login (fixation defense). Logout deletes the
  Redis key; disabling a user deletes every key in their index.
- **The session only authenticates.** Roles, permissions, and data scope are
  resolved per request (3.5 in `04`, and section 4 below), so an admin's
  permission change applies within seconds, not at next login.

### 3.3 Login flow and the RLS chicken-and-egg

Login runs before any tenant context exists, but RLS is fail-closed — an
unbound connection sees zero rows, including `system_tenants`. The flow is:

1. Resolve `tenantCode -> tenantId` using the **platform db handle** (owner
   role). This is the one sanctioned use of the cross-tenant path in the normal
   request flow: a single indexed lookup, no user data.
2. Everything else runs inside `withTenant(tenantId)`: load the user by email,
   verify argon2id hash, write the login log, create the session.
3. Unknown tenant code: log to the application log only (no tenant to attribute
   a DB row to), return the same generic `INVALID_CREDENTIALS` as a wrong
   password — never reveal whether a tenant or email exists.

### 3.4 Passwords

- argon2id with library defaults; hash format stores its own parameters, so
  upgrades re-hash on next successful login.
- Minimum 10 characters; no composition rules, no forced rotation.
- Change-password requires the current password and destroys all other sessions.
- Reset in phase 1 is **admin-set temporary password** (flag
  `must_change_password`); email self-reset arrives with the notification
  channel, not before.

### 3.5 Throttling and login log

- Login endpoint: rate-limited per IP and per `(tenantCode, email)`
  (`@nestjs/throttler` + Redis). After 5 consecutive failures per account:
  15-minute lockout; failures and lockouts are visible in the login log.
- `system_login_logs`: tenant_id, user_id (nullable — unknown email), attempted
  email, ip, user agent, outcome (`SUCCESS`, `BAD_PASSWORD`, `LOCKED`,
  `DISABLED`), created_at. Append-only; this is `system`'s login-log ownership
  from the roadmap.

## 4. Authorization

### 4.1 Four separate concepts

| Concept            | Lives in                          | Answers                                  |
| ------------------ | --------------------------------- | ----------------------------------------- |
| Permission         | Code registry (not DB)            | What actions exist in the product         |
| Role               | `system_roles` (tenant-defined)   | Which permission bundle a tenant created  |
| Data scope         | `system_users` + branch join      | Which rows a user may see                 |
| Module entitlement | `system_tenant_modules`           | Which product modules the tenant bought   |

Role never implies scope (business rule A2). Entitlement never implies
permission (rule A4) — a tenant may have `finance` enabled while a user has no
finance permission, and vice versa.

### 4.2 Permission keys

Format: `module:resource:action` — `academic:enrollment:read`,
`finance:receivable:write`, `system:user:manage`.

- The registry is code: each module contributes a `*.permissions.ts` file;
  a single aggregated list feeds validation, seeding, and the frontend.
  Permissions are product surface, not tenant data — the DB stores only
  role-to-key assignments.
- `*` is a valid assignment meaning "everything" (Owner role). No other
  wildcard forms in v1.
- The `module` segment doubles as the entitlement key: `PermissionsGuard`
  checks that the module prefix is enabled for the tenant before checking the
  permission itself. Disabled module = `404`-style invisibility, not `403`.

### 4.3 Tables (system module, all tenant-scoped + RLS)

```txt
system_users            id, tenant_id, person_id?, email, password_hash,
                        status (ACTIVE|DISABLED), data_scope_type
                        (TENANT|BRANCH_SET|SELF), must_change_password,
                        last_login_at
system_roles            id, tenant_id, code, name, is_system
system_role_permissions role_id, tenant_id, permission_key
system_user_roles       user_id, role_id, tenant_id
system_user_branches    user_id, branch_id, tenant_id   (rows only for BRANCH_SET)
system_tenant_modules   tenant_id, module_key, enabled, effective range
system_login_logs       (see 3.5)
```

Data scope sits on the **user**, not on the role or the assignment: one user =
one visibility rule, matching `TenantScope.branchIds` in the tenancy doc.
Per-assignment scope ("teacher at branch A, admin at branch B") is a known
possible upgrade; do not build it until a real customer needs it.

### 4.4 Request pipeline

```txt
requestId
  -> sessionMiddleware        cookie -> Redis -> req.auth = { userId, tenantId }
    -> tenantContextMiddleware  resolve authz (4.5) -> TenantContext.run(scope)
      -> AuthGuard / TenantGuard   fail closed; @Public() opts out
        -> PermissionsGuard        @RequirePermissions("finance:receivable:read")
                                   checks entitlement (module prefix) + permission
          -> handler
```

Controllers declare permissions with `@RequirePermissions(...)`; a route without
the decorator (and without `@Public()`) fails closed in review — lint/test
asserts every route carries one of the two.

### 4.5 Authorization resolution and caching

Per request, from `userId + tenantId`:

1. Load role ids -> permission keys, user's `data_scope_type` -> `branchIds`
   (`"ALL"` for TENANT, explicit list for BRANCH_SET, list + self-marker for SELF).
2. Build `TenantScope { tenantId, userId, branchIds, permissions }`.
3. Cache the resolved bundle in Redis (`authz:<tenantId>:<userId>`, TTL 60s),
   invalidated eagerly on role/user/scope mutations. Worst case a revoked
   permission lives 60 more seconds; a deleted session dies immediately.

`SELF` scope interpretation is module-specific (own classes via teacher
assignment, own leads via assigned staff) and is applied by repositories the
same way branch filters are — documented per module as it is built.

### 4.6 Working branch (multi-branch users)

Data scope answers "which branches **may** this user see". A separate concern
is which branch the user is **currently working on** — the branch stamped onto
a new enrollment, the branch a dashboard is filtered to. These must not be
conflated:

| Concept        | Nature                  | Lives in                              |
| -------------- | ----------------------- | ------------------------------------- |
| Data scope     | Authorization boundary  | `TenantScope.branchIds` (server)      |
| Working branch | UI/workflow state       | Client (URL param + remembered choice) |

Rules:

1. The working branch is **never server session state**. It travels explicitly
   per request: list endpoints accept an optional `branchId` filter; write DTOs
   carry `branchId` where the record is branch-attributed. This keeps two
   browser tabs free to work on two branches, makes links shareable, and keeps
   the API free of hidden state.
2. The server treats a client-sent `branchId` as **input, not authority**:
   every read filter and every write is validated against
   `TenantScope.branchIds` (`applyBranchScope` / DTO validation). Out of scope
   -> `403`.
3. No `branchId` filter on a list = all branches within scope.
4. `/auth/me` returns the scoped branches (`id`, `name`) so the branch switcher
   renders without an extra call. Single-branch scope: auto-selected; multi:
   the frontend remembers the last choice per user.

## 5. Bootstrap and Seeded Roles

Tenant provisioning (platform path) creates:

- `Owner` role (`is_system`, permission `*`) assigned to the first user
- `Admin` role (`is_system`, all `system:*` keys) as a starting point
- all currently-sold modules enabled in `system_tenant_modules`

Tenants create further roles themselves. `is_system` roles cannot be deleted or
have their key permissions stripped by tenant admins.

Dev seed: one tenant, one Owner user, both branches, all modules enabled.

## 6. Frontend Contract

- `POST /api/v1/auth/login` `{ tenantCode, email, password }` -> sets cookie,
  returns the same payload as `/auth/me`.
- `GET /api/v1/auth/me` -> `{ user, tenant, branchScope, permissions[] }` —
  the console boots from this single call.
- Menu/sidebar visibility is a static frontend config keyed by permission
  (`"finance:receivable:read"` shows the receivables menu). No menu tables in v1.
- `401` (no/expired session) -> redirect to login. `403` -> permission toast.
  The frontend hides what users cannot do, but the API is the enforcement.

## 7. Platform Admin

Platform operations (tenant provisioning, cross-tenant support) do not use
tenant RBAC. Phase 1 keeps this deliberately minimal: a separate
`platform_admins` credential table (no tenant_id, owner-role db path, its own
login endpoint and session namespace) guarded to provisioning endpoints only.
Every platform action is audit-logged with actor and reason
(`04-tenancy-and-data-scope.md` section 9).

## 8. Testing Requirements

1. Login: success, wrong password, unknown email, unknown tenant code — the
   last three return identical `INVALID_CREDENTIALS`; lockout after 5 failures.
2. Session: logout kills access; disable-user kills all sessions; cookie
   tampering fails signature check.
3. Guards fail closed: no session -> 401; missing `@RequirePermissions` +
   missing `@Public` -> rejected by the route-metadata test.
4. Permission and entitlement: role without key -> 403; disabled module -> not
   found; `*` grants all.
5. Data scope: BRANCH_SET user reads only scoped branches' rows (on top of the
   RLS tenant tests, which stay separate).
6. Authz cache invalidation: revoking a role takes effect within TTL; eager
   invalidation path takes effect immediately.

## 9. Out of Scope (revisit when needed)

SSO/OAuth, 2FA, email self-service reset, API keys / machine tokens,
per-assignment data scope, DB-driven menus, password breach checking.
