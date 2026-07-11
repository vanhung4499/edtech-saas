import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./schema/index";
import { branchesTable, tenantsTable } from "./schema/index";
import { withTenant } from "./tenant";

// Integration suite — needs Postgres from `docker compose up -d`. This is the
// permanent regression gate every future tenant-owned table must pass
// (04-tenancy-and-data-scope.md §10). Uses a single-connection pool (max: 1)
// so every query in this file is forced through the same physical connection
// — the exact scenario that exposed the pooled-GUC-revert bug while building
// step 4 (0003_fix_rls_pooled_connection_guc_revert). A pool with multiple
// idle connections could hide that regression by luck.
const { Pool } = pg;

const ownerPool = new Pool({ connectionString: process.env.DATABASE_MIGRATE_URL, max: 1 });
const ownerDb = drizzle(ownerPool, { schema });

const appPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const appDb = drizzle(appPool, { schema });

let tenantAId: string;
let tenantBId: string;

beforeAll(async () => {
  const suffix = randomUUID();

  const [tenantA] = await ownerDb
    .insert(tenantsTable)
    .values({ name: "Isolation Test Tenant A", code: `isolation-a-${suffix}` })
    .returning();
  const [tenantB] = await ownerDb
    .insert(tenantsTable)
    .values({ name: "Isolation Test Tenant B", code: `isolation-b-${suffix}` })
    .returning();

  tenantAId = tenantA.id;
  tenantBId = tenantB.id;

  await ownerDb
    .insert(branchesTable)
    .values([
      { tenantId: tenantAId, name: "Branch A1", code: "main" },
      { tenantId: tenantBId, name: "Branch B1", code: "main" },
    ]);
});

afterAll(async () => {
  const tenantIds = [tenantAId, tenantBId];

  await ownerDb.delete(branchesTable).where(inArray(branchesTable.tenantId, tenantIds));
  await ownerDb.delete(tenantsTable).where(inArray(tenantsTable.id, tenantIds));
  await ownerPool.end();
  await appPool.end();
});

describe("tenant isolation (04-tenancy-and-data-scope.md §10)", () => {
  it("1. withTenant(A): unfiltered select on system_branches returns only A's rows", async () => {
    const rows = await withTenant(appDb, tenantAId, (tx) => tx.select().from(branchesTable));

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.tenantId === tenantAId)).toBe(true);
  });

  it("2. withTenant(A): inserting a row with tenant_id=B fails the with check", async () => {
    await expect(
      withTenant(appDb, tenantAId, (tx) =>
        tx.insert(branchesTable).values({ tenantId: tenantBId, name: "Cross-tenant write", code: "sneaky" }),
      ),
    ).rejects.toThrow();
  });

  it("3. no tenant context: select returns zero rows, insert fails", async () => {
    const rows = await appDb.select().from(branchesTable);
    expect(rows).toEqual([]);

    await expect(
      appDb.insert(branchesTable).values({ tenantId: tenantAId, name: "No context", code: "no-context" }),
    ).rejects.toThrow();
  });

  it("4. withTenant(A) on system_tenants sees only its own row", async () => {
    const rows = await withTenant(appDb, tenantAId, (tx) => tx.select().from(tenantsTable));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(tenantAId);
  });

  it("5. two sequential withTenant calls on the same connection don't leak", async () => {
    const aRows = await withTenant(appDb, tenantAId, (tx) => tx.select().from(branchesTable));
    const bRows = await withTenant(appDb, tenantBId, (tx) => tx.select().from(branchesTable));

    expect(aRows.every((row) => row.tenantId === tenantAId)).toBe(true);
    expect(bRows.every((row) => row.tenantId === tenantBId)).toBe(true);

    const aIds = new Set(aRows.map((row) => row.id));
    expect(bRows.some((row) => aIds.has(row.id))).toBe(false);
  });

  it("6. after those withTenant calls, the same connection is unbound again (pool-reuse regression)", async () => {
    const rows = await appDb.select().from(branchesTable);
    expect(rows).toEqual([]);
  });
});
