-- "system_tenant_modules" was the wrong name: this table isn't "a tenant's
-- modules", it's a commercial/platform fact about what the tenant is
-- entitled to (09-auth-and-authorization.md §5). Renaming, not editing
-- 0004/0005 (already applied) — data, RLS policy, and FK all carry over
-- automatically since this is the same table object, just renamed.
alter table "system_tenant_modules" rename to "system_module_entitlements";
--> statement-breakpoint
alter table "system_module_entitlements"
  rename constraint "system_tenant_modules_pkey" to "system_module_entitlements_pkey";
--> statement-breakpoint
alter table "system_module_entitlements"
  rename constraint "system_tenant_modules_tenant_id_module_key_unique" to "system_module_entitlements_tenant_id_module_key_unique";
--> statement-breakpoint
alter table "system_module_entitlements"
  rename constraint "system_tenant_modules_tenant_id_system_tenants_id_fk" to "system_module_entitlements_tenant_id_system_tenants_id_fk";