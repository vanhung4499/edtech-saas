# Plan: Auth + RBAC/Data-Scope Implementation

| Field        | Value                                                      |
| ------------ | ----------------------------------------------------------- |
| Status       | In progress — step 2 of 9 done                             |
| Date         | 2026-07-06                                                 |
| Scope        | Implement `docs/technical/09-auth-and-authorization.md`    |
| Depends on   | `docs/plans/tenant-isolation.md` (steps 1–5 must be done)  |
| Out of scope | Person module, admissions/academic screens, email sending  |

## 1. Goal

Users can log into the operator console; roles and branch/data scope restrict
what they can do and see; every business route is permission-guarded by
default. This completes the remaining exit criteria of roadmap Phase 1.

## 2. Prerequisites (from tenant-isolation plan)

- `TenantContext`, `withTenant`, `Database` provider, RLS on system tables
- `edtech_app` / owner role split (`DATABASE_URL` / `DATABASE_MIGRATE_URL`)
- The platform db handle exists (owner-role connection for the narrow
  cross-tenant path) — if the tenant plan did not create it, it is created in
  step 3 here for the tenant-code lookup.

New dependencies to add in `apps/api`: `argon2`, `ioredis`, `cookie-parser`,
`@nestjs/throttler`. New env: `REDIS_URL` becomes required for the api
(already in `.env.example`), `AUTH_SECRET` already exists.

## 3. Work Breakdown

### Step 1: Schema + RLS

Tables per design doc 4.3: `system_users`, `system_roles`,
`system_role_permissions`, `system_user_roles`, `system_user_branches`,
`system_module_entitlements`, `system_login_logs`, plus `platform_admins`
(no tenant_id, **no** tenant RLS — platform path only).

- All tenant-scoped tables: `tenantColumn`, tenant-led indexes, per-tenant
  uniques (`unique(tenant_id, email)` on users, `unique(tenant_id, code)` on
  roles), RLS policy in the same migration (`enableTenantRls`).
- `system_login_logs` is append-only (no update path in code).
- Update seed: dev tenant, branches, all modules enabled, Owner/Admin roles,
  one Owner user (argon2id-hashed password), one platform admin.

Done: migration applies from zero; seeded rows visible under
`withTenant(devTenant)` and invisible without context.

**Status: done.** Migrations `0004_system_auth_tables` (schema) and
`0005_enable_rls_system_auth_tables` (RLS on the 7 tenant-scoped tables, via
`enableTenantRls`) applied cleanly from zero against a real local Postgres.
`platform_admins` explicitly `revoke all ... from edtech_app` in the same
migration — migration 0000's `alter default privileges` would otherwise have
silently granted it blanket DML like every other future table; verified
`edtech_app` gets `permission denied for table platform_admins` even with a
valid tenant GUC set (a hard grant-level denial, not RLS — there's no
`tenant_id` on this table for RLS to key off). Seed produces 1 tenant, 2
branches, 5 enabled tenant modules, Owner + Admin roles (`is_system: true`),
1 Owner user (`must_change_password: true`), 1 platform admin — all
argon2id-hashed, all idempotent on re-run (select-or-insert per entity, not
`onConflictDoNothing`, since later steps need the ids either way). Verified
`edtech_app` sees zero rows on `system_users`/`system_roles` without tenant
context, and exactly the seeded rows with the correct tenant GUC set.
Admin role intentionally has zero `system_role_permissions` rows for now —
assigning specific keys means guessing step 2's registry format before it
exists.

### Step 2: Permission registry + decorators

- `apps/api/src/common/auth/permissions.ts`: aggregated registry; each module
  later contributes `<module>.permissions.ts`. Start with `system:*` keys
  (user/role/branch/module-entitlement management) and the `*` wildcard rule.
- `@RequirePermissions(...keys)` and `@Public()` decorators (metadata only
  at this step).
- Registry unit test: every key matches `module:resource:action` shape; module
  prefixes come from the known module list.

Done: registry importable by guards, seed (role permissions), and later the
frontend.

**Status: done.** `common/auth/permissions.ts` has 7 `system:*` keys
(`user`/`role`/`branch` each with `manage` + `read`, plus
`module-entitlement:read` only — no `manage` key exists for module
entitlement, since enabling/disabling a tenant's modules is a platform/billing
decision, not something a tenant's own Owner can do via RBAC). Renamed
`system_tenant_modules`/`tenantModulesTable` to
`system_module_entitlements`/`moduleEntitlementsTable` to make that
distinction unambiguous in the schema itself, via a new migration (0004/0005
were already applied). `@RequirePermissions`
(`common/auth/require-permissions.decorator.ts`) is typed against a
`PermissionKey` union derived from the registry, not `string` — confirmed a
typo'd key is a compile error, not a silent always-false check. `@Public()`
already existed from the tenant-isolation plan (step 5), reused as-is.
Registry unit test covers key shape, known-module prefixes, no duplicates.

### Step 3: Session infrastructure

- `apps/api/src/common/auth/session.store.ts`: Redis-backed store
  (create/get/touch/destroy/destroyAllForUser), sliding TTL 12h, absolute 7d,
  `user-sessions:<tenantId>:<userId>` index.
- Signed cookie handling (`cookie-parser` + `AUTH_SECRET`), cookie name
  `edtech_session`, httpOnly, SameSite=Lax, Secure in prod.
- `session.middleware.ts`: cookie -> store -> `req.auth = { userId, tenantId }`;
  invalid/expired -> clears cookie, leaves `req.auth` unset (guards decide).
- Origin check for mutating methods against `APP_URL`.
- Platform db handle (`db.platform.ts`, owner role) if not already present.

Done: unit tests on store TTL/index behavior with a real Redis from compose.

### Step 4: Auth module (login/logout/me/change-password)

`apps/api/src/modules/system/auth/` (light module):

- `POST /api/v1/auth/login` — flow from design doc 3.3: tenant-code lookup on
  the platform handle, then `withTenant`: user lookup, argon2 verify (re-hash on
  parameter drift), lockout check, login log write, session create (regenerated
  id), cookie set. Uniform `INVALID_CREDENTIALS` for unknown
  tenant/email/password.
- `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`,
  `POST /api/v1/auth/change-password` (current password required; destroys
  other sessions; clears `must_change_password`).
- Throttling: `@nestjs/throttler` per-IP on `/auth/login` + per-account
  failure counter in Redis (5 fails -> 15 min lock, outcome `LOCKED` logged).

Done: e2e-style specs for the four endpoints against real Postgres+Redis.

### Step 5: Guards + authorization resolution

- `authz.resolver.ts`: `userId+tenantId` -> `{ permissions, branchIds, scopeType }`
  from roles/user-branches, Redis cache `authz:<tenantId>:<userId>` TTL 60s,
  eager invalidation hooks exported for step 6 mutations.
- Extend `tenantContextMiddleware`: when `req.auth` exists, resolve authz and
  populate the full `TenantScope` (until now it only carried ids).
- `PermissionsGuard`: reads `@RequirePermissions` metadata; checks module
  entitlement (prefix -> `system_module_entitlements`, cached with authz bundle),
  then permission (`*` honored). Disabled module -> `AppException.notFound`.
- Route-metadata conformance test: every registered route has
  `@RequirePermissions` or `@Public` (reflection over the router) — this
  is the "fail closed in review" enforcement.

Done: guard test matrix (no session / no permission / disabled module / `*`).

### Step 6: System management endpoints (minimum to operate)

Light-module CRUD under `/api/v1/system/`, all permission-guarded:

- users: create (temp password + `must_change_password`), list, disable/enable
  (disable destroys sessions), set data scope + branches, assign roles
- roles: CRUD + set permissions (validated against the registry; `is_system`
  protected)
- module entitlements: list only (`system:module-entitlement:read`) — enabling
  or disabling a tenant's modules is a platform/billing decision, not a
  tenant self-service action; it happens via the platform admin path (step 9),
  not this endpoint

Every mutation calls the authz cache invalidation from step 5.

Done: an Owner can create a BRANCH_SET user via API and that user's `/auth/me`
shows the reduced scope; revocation applies immediately.

### Step 7: Data-scope enforcement helper

- `applyBranchScope(query, table, requestedBranchId?)` helper (or repository
  convention): validates a client-requested `branchId` against
  `TenantScope.branchIds` (out of scope -> 403), else filters to the full
  scope; `"ALL"` adds nothing; `SELF` marker is defined but interpreted per
  module later. Write DTOs carrying `branchId` get the same validation.
- Used by the branch list endpoint as the first real consumer; documented as
  the pattern for all future operational tables.
- `/auth/me` includes the scoped branches (`id`, `name`) for the frontend
  branch switcher (design doc 09 section 4.6).

Done: BRANCH_SET user listing branches sees only scoped branches; requesting an
out-of-scope `branchId` returns 403 (tests).

### Step 8: Web login slice

`apps/web`: login page (tenantCode/email/password, RHF+zod), shared fetch layer
(`credentials: "include"`, envelope unwrap, 401 -> redirect), auth provider
booting from `/auth/me`, guarded app shell, logout. Menu visibility keyed by
permissions from `/auth/me` (static config).

Done: manual flow — login as seeded Owner, see shell, logout; wrong password
shows uniform error.

### Step 9: Platform admin minimal path

- `platform_admins` login (separate endpoint + session namespace, no tenant),
  guarded provisioning endpoint: create tenant (+ Owner role/user + modules) —
  the productized version of what seed does.
- Audit-log every platform action (actor, action, target tenant, reason field).

Done: a new tenant can be provisioned via API and its Owner can log in.

## 4. Acceptance Criteria

- [ ] Roadmap Phase-1 exits: login works; roles + branch/data scope restrict
      access; isolation tests still green.
- [ ] Route-metadata test enforces permission-or-public on every route.
- [ ] Uniform `INVALID_CREDENTIALS`; lockout works; login log records outcomes.
- [ ] Disable user / revoke role take effect per design (immediate / ≤60s).
- [ ] `.env.example`, `server-env.ts` (Redis required), docs 04/08/09 consistent
      with what shipped.

## 5. Risks / Open Points

- **Redis becomes a hard runtime dependency** of the api (sessions). Acceptable
  — it is already in compose; document in 01-architecture when shipping.
- **Session in Redis without persistence** means restart logs everyone out in
  dev; fine. Production Redis needs AOF or acceptance of re-login on failover —
  note for the deployment doc (not yet written).
- **Throttler + multiple api instances**: per-account lockout counter lives in
  Redis (shared) — per-IP throttling is best-effort per instance; acceptable.
- **`SELF` scope** is declared but not enforced anywhere yet — first real use
  arrives with teacher-facing academic screens; keep it visibly "defined, not
  yet consumed" in doc 09 until then.

## 6. Suggested Commit Sequence

1. `feat(db): auth/rbac schema, RLS, seed roles and owner user`
2. `feat(api): permission registry and auth decorators`
3. `feat(api): redis session store and session middleware`
4. `feat(api): auth endpoints with lockout and login log`
5. `feat(api): permissions guard, authz resolution and caching`
6. `feat(api): system user/role/module management endpoints`
7. `feat(api): branch data-scope enforcement helper`
8. `feat(web): login page and authenticated shell`
9. `feat(api): platform admin provisioning path`
