import { describe, expect, it, vi } from "vitest";
import type { Database } from "../database/database.service";
import { TenantContext } from "./tenant-context";
import { runTenantJob, type TenantJobData } from "./tenant-job";

function createFakeDatabase(): Database {
  return {
    run: vi.fn((fn: (tx: unknown) => unknown) => Promise.resolve(fn("fake-tx"))),
  } as unknown as Database;
}

describe("runTenantJob", () => {
  it("fails closed when the job has no tenant context", async () => {
    const database = createFakeDatabase();
    const jobData = { __ctx: { tenantId: "", userId: null } } as TenantJobData;

    await expect(runTenantJob(database, jobData, async () => "unreachable")).rejects.toThrow(
      "Job is missing tenant context (__ctx.tenantId)",
    );
  });

  it("establishes TenantContext and runs the handler through database.run", async () => {
    const database = createFakeDatabase();
    const jobData: TenantJobData = { __ctx: { tenantId: "tenant-1", userId: "user-1" } };

    const result = await runTenantJob(database, jobData, async (tx, data) => {
      expect(tx).toBe("fake-tx");
      expect(data).toBe(jobData);
      expect(TenantContext.current()).toEqual({
        tenantId: "tenant-1",
        userId: "user-1",
        branchIds: "ALL",
        roles: [],
      });
      return "handled";
    });

    expect(result).toBe("handled");
    expect(database.run).toHaveBeenCalledTimes(1);
    expect(TenantContext.current()).toBeUndefined();
  });
});
