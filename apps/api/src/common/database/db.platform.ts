import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ServerEnv } from "../../config/server-env";
import { createDatabaseClient, type Db } from "../../database";

export const PLATFORM_DB = Symbol("PLATFORM_DB");

// Owner-role connection, bypasses RLS — for the narrow, audited cross-tenant
// path only (04-tenancy-and-data-scope.md §9): tenant-code lookup at login
// (§3.3), tenant provisioning, cross-tenant billing. Exported raw (unlike DB,
// which only leaves this module wrapped in Database/withTenant): there's no
// "make it tenant-safe" wrapper to apply here, since deliberate cross-tenant
// access is this handle's entire purpose. Callers are expected to be narrow
// and few.
export const platformDbProvider: Provider = {
  provide: PLATFORM_DB,
  useFactory: (config: ConfigService<ServerEnv, true>): Db => {
    const url = config.get("DATABASE_MIGRATE_URL", { infer: true });

    if (!url) {
      throw new Error("DATABASE_MIGRATE_URL is required for the platform db handle");
    }

    return createDatabaseClient(url);
  },
  inject: [ConfigService],
};
