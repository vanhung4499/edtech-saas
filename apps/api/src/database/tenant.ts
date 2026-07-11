import { sql } from "drizzle-orm";
import type { Db } from "./client";

// Transaction handle repositories query through inside withTenant — never the
// raw Db client, which has no tenant bound and would hit RLS's zero-row
// fail-closed default (04-tenancy-and-data-scope.md §6.2).
export type TenantTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Opens a transaction and binds it to one tenant for RLS (§6.3). `true` (the
// third set_config argument) scopes the GUC to this transaction only — it's
// discarded automatically on commit/rollback, so a pooled connection can never
// leak one tenant's id into the next unrelated request that reuses it.
export async function withTenant<T>(
  db: Db,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
