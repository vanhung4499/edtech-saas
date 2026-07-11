-- Bug found while building Step 4 (withTenant): set_config('app.tenant_id', v, true)
-- scopes the GUC to one transaction, but on a pooled connection that has ever
-- had it set, it reverts to '' (not NULL) on commit/rollback. Casting
-- ''::uuid directly throws instead of degrading to zero rows, so a later
-- request reusing that connection outside withTenant got a 500 instead of the
-- intended fail-closed empty result. nullif(..., '') restores NULL before the
-- cast (04-tenancy-and-data-scope.md §6.2).
alter policy tenant_isolation on "system_branches"
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
alter policy tenant_isolation on "system_tenants"
  using (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (id = nullif(current_setting('app.tenant_id', true), '')::uuid);