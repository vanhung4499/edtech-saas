-- Standard tenant-owned table policy (04-tenancy-and-data-scope.md §6.2).
-- Generated via tenant-rls.ts's enableTenantRls(branchesTable) — paste that
-- output for every future tenant-owned table's own migration.
alter table "system_branches" enable row level security;
--> statement-breakpoint
alter table "system_branches" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_branches"
  using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint

-- system_tenants special case: it has no tenant_id (it IS the tenant), so the
-- policy is on its own id instead. A bound connection sees only its own row;
-- cross-tenant listing is a platform operation via the owner role.
alter table "system_tenants" enable row level security;
--> statement-breakpoint
alter table "system_tenants" force row level security;
--> statement-breakpoint
create policy tenant_isolation on "system_tenants"
  using (id = current_setting('app.tenant_id', true)::uuid)
  with check (id = current_setting('app.tenant_id', true)::uuid);