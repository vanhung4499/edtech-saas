-- Standard tenant-owned table policy, generated via
-- tenant-rls.ts's enableTenantRls(table) for each of the 7 new tenant-scoped
-- auth tables (09-auth-and-authorization.md §4.3).
alter table "system_users" enable row level security;
--> statement-breakpoint
alter table "system_users" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_users"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_roles" enable row level security;
--> statement-breakpoint
alter table "system_roles" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_roles"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_role_permissions" enable row level security;
--> statement-breakpoint
alter table "system_role_permissions" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_role_permissions"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_user_roles" enable row level security;
--> statement-breakpoint
alter table "system_user_roles" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_user_roles"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_user_branches" enable row level security;
--> statement-breakpoint
alter table "system_user_branches" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_user_branches"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_tenant_modules" enable row level security;
--> statement-breakpoint
alter table "system_tenant_modules" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_tenant_modules"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter table "system_login_logs" enable row level security;
--> statement-breakpoint
alter table "system_login_logs" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_login_logs"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint

-- platform_admins: deliberately NO tenant RLS (no tenant_id — sits outside
-- the tenant boundary entirely, 09-auth-and-authorization.md §7). Migration
-- 0000's `alter default privileges` granted edtech_app blanket DML on every
-- future table, including this one — revoke it explicitly so the runtime
-- role can never touch platform admin credentials, even via an application
-- bug. Only the owner-role platform db handle may query this table.
revoke all on "platform_admins" from edtech_app;