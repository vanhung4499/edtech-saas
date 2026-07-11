import type { Database } from "../database/database.service";
import type { TenantTx } from "../../database";
import { TenantContext, type TenantScope } from "./tenant-context";

// Attached by the enqueue-side helper (not built yet — lands with the first
// BullMQ producer). Every job carries its own tenant, since it runs without
// an HTTP request to derive one from (04-tenancy-and-data-scope.md §7).
// Never call queue.add() directly for tenant work — go through that helper
// once it exists, so __ctx can never be forgotten.
export interface TenantJobData {
  __ctx: {
    tenantId: string;
    userId: string | null;
  };
}

// Worker-side counterpart to tenant-context.middleware.ts: re-establishes
// TenantContext from the job payload instead of a verified request. Fails
// closed — a job missing __ctx.tenantId throws before touching the database,
// same as an unbound HTTP request getting zero rows from RLS.
export async function runTenantJob<TData extends TenantJobData, TResult>(
  database: Database,
  jobData: TData,
  handler: (tx: TenantTx, jobData: TData) => Promise<TResult>,
): Promise<TResult> {
  const tenantId = jobData.__ctx?.tenantId;

  if (!tenantId) {
    throw new Error("Job is missing tenant context (__ctx.tenantId)");
  }

  const scope: TenantScope = {
    tenantId,
    userId: jobData.__ctx.userId,
    branchIds: "ALL",
    roles: [],
  };

  return TenantContext.run(scope, () => database.run((tx) => handler(tx, jobData)));
}
