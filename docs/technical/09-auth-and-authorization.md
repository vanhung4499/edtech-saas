# Auth and Authorization

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | Active                                                             |
| Date       | 2026-07-06                                                         |
| Scope      | Authentication, tokens, RBAC, data scope, module entitlement       |
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
| Authentication     | Stateless JWT (short access + refresh token), `Authorization: Bearer` |
| Password hashing   | argon2id                                                        |
| Authorization      | RBAC with code-defined permission keys + user-level data scope  |
| Module gating      | Tenant module entitlement, checked via the permission key prefix |
| Menu visibility    | Derived client-side from permissions (no DB-driven menus in v1) |

**Why stateless JWT (not server-side sessions):** this is a small, first-party
operator console — only a center's own staff log in, so daily request volume is
low and there is no public/anonymous traffic. Standard `Bearer`-token JWT is the
industry-normal choice and the simplest thing that works: no session store, no
Redis on the auth path, no cookie/CSRF machinery (a `Bearer` header is not
auto-attached by the browser, so CSRF does not apply and no origin check is
needed).

The one thing stateless JWT gives up is *server-side revocation of a specific
token before it expires* — there is no session to delete. This does **not** cost
us the operationally important cases, because **authorization is resolved from
the DB on every request** (section 4.5), not carried in the token:

- Firing/disabling a user takes effect immediately: every request re-checks
  `system_users.status`, and a `DISABLED` user is rejected at once — their live
  access token stops working on its next call, and `/auth/refresh` refuses to
  mint a new one.
- A role or permission change takes effect immediately for the same reason.

What remains bounded by the access-token TTL (~15 min) is only a *leaked access
token for a still-active user* — mitigated by the short TTL and by keeping the
token out of durable client storage where practical. If a future requirement
demands hard per-token logout (e.g. a public API or mobile client), a token
denylist or a move back to server sessions can be added then without touching
the authorization model.

## 3. Authentication

### 3.1 Login identity

- User accounts are tenant-scoped: `system_users` with `unique(tenant_id, email)`.
  The same email may exist in two tenants as two unrelated accounts.
- Login input: `tenantCode + email + password`. The tenant code is pre-filled by
  subdomain later (`acme.app` -> tenant `acme`); the resolved tenant must always
  match the account's tenant.
- `system_users.person_id` (nullable) links staff accounts to `Person` once the
  person module lands. A user is not a person (`docs/business` rule).

### 3.2 Tokens

- **Access token:** JWT (HS256, signed with `AUTH_SECRET`), TTL ~15 min. Claims
  are minimal — `{ sub: userId, tid: tenantId }` plus standard `iat`/`exp` — and
  are **identity only**. Roles, permissions and data scope are **not** in the
  token; they are resolved from the DB per request (section 4.5), so an admin's
  permission change or a user disable applies on the very next request, not at
  next login.
- **Refresh token:** JWT (HS256, same secret, distinct `typ: "refresh"` claim),
  TTL ~7 days. Exchanged at `POST /auth/refresh` for a fresh access token after
  re-checking the user is still `ACTIVE`. When it expires, the user logs in
  again. No rotation/replay-tracking machinery in v1 (that needs server state,
  which stateless JWT deliberately avoids); a low-traffic internal console does
  not justify it.
- **Transport:** both tokens are returned in the login/refresh **response body**;
  the client sends the access token as `Authorization: Bearer <token>`. No
  cookies, so **CSRF does not apply** and there is no origin check. Frontend
  token storage (in-memory access token, refresh kept where the app chooses) is
  a web-app concern (section 6), out of the API's scope.
- **Logout is client-side:** the client discards its tokens. There is no
  server-side session to delete. Hard invalidation of an *active* user is done
  by disabling the account (section 4.5 status check), not by killing a token.

### 3.3 Login flow and the RLS chicken-and-egg

Login runs before any tenant context exists, but RLS is fail-closed — an
unbound connection sees zero rows, including `system_tenants`. The flow is:

1. Resolve `tenantCode -> tenantId` using the **platform db handle** (owner
   role). This is the one sanctioned use of the cross-tenant path in the normal
   request flow: a single indexed lookup, no user data.
2. Everything else runs inside `withTenant(tenantId)`: load the user by email,
   verify argon2id hash, write the login log, then sign the access + refresh
   tokens and return them.
3. Unknown tenant code: log to the application log only (no tenant to attribute
   a DB row to), return the same generic `INVALID_CREDENTIALS` as a wrong
   password — never reveal whether a tenant or email exists.

### 3.4 Passwords

- argon2id with library defaults; hash format stores its own parameters, so
  upgrades re-hash on next successful login.
- Minimum 10 characters; no composition rules, no forced rotation.
- Change-password requires the current password. With stateless JWT there is no
  session to destroy; already-issued access tokens for the account remain valid
  until they expire (~15 min). If a hard "sign out other devices on password
  change" guarantee is needed later, it arrives with the token-denylist upgrade
  noted in section 2, not before.
- Reset in phase 1 is **admin-set temporary password** (flag
  `must_change_password`); email self-reset arrives with the notification
  channel, not before.

### 3.5 Throttling and login log

- Login endpoint: rate-limited per IP and per `(tenantCode, email)` with
  `@nestjs/throttler` (in-memory storage — the app runs as a single instance at
  this scale; switch the throttler to a shared store if it is ever horizontally
  scaled). After 5 consecutive failures per account: 15-minute lockout, tracked
  on the user row; failures and lockouts are visible in the login log.
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
| Module entitlement | `system_module_entitlements`           | Which product modules the tenant bought   |

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
system_module_entitlements   tenant_id, module_key, enabled, effective range
system_login_logs       (see 3.5)
```

Data scope sits on the **user**, not on the role or the assignment: one user =
one visibility rule, matching `TenantScope.branchIds` in the tenancy doc.
Per-assignment scope ("teacher at branch A, admin at branch B") is a known
possible upgrade; do not build it until a real customer needs it.

### 4.4 Request pipeline

```txt
requestId
  -> jwtAuthMiddleware        Bearer token -> verify -> req.auth = { userId, tenantId }
    -> tenantContextMiddleware  resolve authz (4.5) -> TenantContext.run(scope)
      -> TenantGuard             fail closed; @Public() opts out
        -> PermissionsGuard        @RequirePermissions("finance:receivable:read")
                                   checks entitlement (module prefix) + permission
          -> handler
```

`jwtAuthMiddleware` verifies the `Authorization: Bearer` access token's
signature and expiry; a missing/invalid/expired token leaves `req.auth` unset
and the guards reject it (`@Public()` routes — login, refresh, health — opt
out). Controllers declare permissions with `@RequirePermissions(...)`; a route
without the decorator (and without `@Public()`) fails closed in review —
lint/test asserts every route carries one of the two.

### 4.5 Authorization resolution

Per request, from the token's `userId + tenantId`:

1. Re-check the user is still `ACTIVE` (a `DISABLED` user is rejected here — this
   is what makes disabling take effect immediately without any session to kill).
2. Load role ids -> permission keys, user's `data_scope_type` -> `branchIds`
   (`"ALL"` for TENANT, explicit list for BRANCH_SET, list + self-marker for SELF).
3. Build `TenantScope { tenantId, userId, branchIds, permissions }`.

Resolution hits the DB every request. At this scale (a single center's staff,
low request volume) that is cheap and keeps authorization strictly live — a
revoked permission or a disabled user is enforced on the next request with no
staleness window. No caching layer in v1; if request volume ever makes it worth
it, a short-TTL cache with eager invalidation can be added here without changing
the model.

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
- all currently-sold modules enabled in `system_module_entitlements`

Tenants create further roles themselves. `is_system` roles cannot be deleted or
have their key permissions stripped by tenant admins.

Dev seed: one tenant, one Owner user, both branches, all modules enabled.

## 6. Frontend Contract

- `POST /api/v1/auth/login` `{ tenantCode, email, password }` -> returns
  `{ accessToken, refreshToken }` plus the same profile payload as `/auth/me`.
- `POST /api/v1/auth/refresh` `{ refreshToken }` -> `{ accessToken }` (after
  re-checking the user is still `ACTIVE`).
- `GET /api/v1/auth/me` -> `{ user, tenant, branchScope, permissions[] }` —
  the console boots from this single call, sending `Authorization: Bearer`.
- Menu/sidebar visibility is a static frontend config keyed by permission
  (`"finance:receivable:read"` shows the receivables menu). No menu tables in v1.
- `401` (no/expired/invalid access token) -> try refresh once, else redirect to
  login. `403` -> permission toast. The frontend hides what users cannot do, but
  the API is the enforcement.
- Token storage is a web-app concern: keep the access token in memory and the
  refresh token wherever the app chooses (see `07-frontend-architecture.md`).
  There are no auth cookies, so no CSRF handling is required on either side.

## 7. Platform Admin

Platform operations (tenant provisioning, cross-tenant support) do not use
tenant RBAC. Phase 1 keeps this deliberately minimal: a separate
`platform_admins` credential table (no tenant_id, owner-role db path, its own
login endpoint issuing a distinct token type) guarded to provisioning endpoints
only. Every platform action is audit-logged with actor and reason
(`04-tenancy-and-data-scope.md` section 9).

## 8. Testing Requirements

1. Login: success, wrong password, unknown email, unknown tenant code — the
   last three return identical `INVALID_CREDENTIALS`; lockout after 5 failures.
2. Tokens: a valid access token authenticates; a tampered or expired token fails
   verification (401); refresh mints a new access token; refresh for a now-
   `DISABLED` user is refused.
3. Guards fail closed: no/invalid token -> 401; missing `@RequirePermissions` +
   missing `@Public` -> rejected by the route-metadata test.
4. Permission and entitlement: role without key -> 403; disabled module -> not
   found; `*` grants all.
5. Data scope: BRANCH_SET user reads only scoped branches' rows (on top of the
   RLS tenant tests, which stay separate).
6. Live authorization: revoking a role or disabling a user takes effect on the
   user's next request (no cache TTL to wait out).

## 9. Out of Scope (revisit when needed)

SSO/OAuth, 2FA, email self-service reset, API keys / machine tokens,
per-assignment data scope, DB-driven menus, password breach checking.
