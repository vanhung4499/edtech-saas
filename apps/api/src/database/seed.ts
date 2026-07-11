import { hash } from "argon2";
import { and, eq } from "drizzle-orm";
import {
  branchesTable,
  createDatabaseClient,
  moduleEntitlementsTable,
  rolesTable,
  tenantsTable,
  userRolesTable,
  usersTable,
  type Db,
} from "./index";
import { platformAdminsTable } from "./schema/system";

// Dev-only fixture data. Never used in production — tenant provisioning is a
// product feature (system module, auth-rbac plan step 9), not this script
// (05-database-and-migrations.md §3 rule 4).
const DEV_PASSWORD = "ChangeMe123!";

// Product modules a tenant can be entitled to — not "system", which is the
// always-on platform base, not a purchasable add-on.
const ALL_MODULE_KEYS = ["admissions", "academic", "scheduling", "finance", "reporting"];

async function findOrInsert<TRow>(
  find: () => Promise<TRow[]>,
  insert: () => Promise<TRow[]>,
): Promise<TRow> {
  const [existing] = await find();
  if (existing) {
    return existing;
  }

  const [created] = await insert();
  // insert() always returns the row it just created.
  return created!;
}

async function seedTenant(db: Db) {
  return findOrInsert(
    () => db.select().from(tenantsTable).where(eq(tenantsTable.code, "demo")),
    () => db.insert(tenantsTable).values({ name: "Demo Education Center", code: "demo" }).returning(),
  );
}

async function seedBranches(db: Db, tenantId: string) {
  const main = await findOrInsert(
    () =>
      db
        .select()
        .from(branchesTable)
        .where(and(eq(branchesTable.tenantId, tenantId), eq(branchesTable.code, "main"))),
    () =>
      db
        .insert(branchesTable)
        .values({ tenantId, name: "Main Campus", code: "main" })
        .returning(),
  );

  const second = await findOrInsert(
    () =>
      db
        .select()
        .from(branchesTable)
        .where(and(eq(branchesTable.tenantId, tenantId), eq(branchesTable.code, "branch-2"))),
    () =>
      db
        .insert(branchesTable)
        .values({ tenantId, name: "Second Campus", code: "branch-2" })
        .returning(),
  );

  return [main, second];
}

async function seedModuleEntitlements(db: Db, tenantId: string) {
  for (const moduleKey of ALL_MODULE_KEYS) {
    await findOrInsert(
      () =>
        db
          .select()
          .from(moduleEntitlementsTable)
          .where(
            and(
              eq(moduleEntitlementsTable.tenantId, tenantId),
              eq(moduleEntitlementsTable.moduleKey, moduleKey),
            ),
          ),
      () =>
        db
          .insert(moduleEntitlementsTable)
          .values({ tenantId, moduleKey, enabled: true })
          .returning(),
    );
  }
}

async function seedRoles(db: Db, tenantId: string) {
  const owner = await findOrInsert(
    () =>
      db
        .select()
        .from(rolesTable)
        .where(and(eq(rolesTable.tenantId, tenantId), eq(rolesTable.code, "owner"))),
    () =>
      db
        .insert(rolesTable)
        .values({ tenantId, code: "owner", name: "Owner", isSystem: true })
        .returning(),
  );

  // Admin's permission assignments land with the permission registry
  // (auth-rbac plan step 2) — the role exists now, but has no
  // system_role_permissions rows yet. Seeding specific keys here would mean
  // guessing step 2's registry format before it exists.
  const admin = await findOrInsert(
    () =>
      db
        .select()
        .from(rolesTable)
        .where(and(eq(rolesTable.tenantId, tenantId), eq(rolesTable.code, "admin"))),
    () =>
      db
        .insert(rolesTable)
        .values({ tenantId, code: "admin", name: "Admin", isSystem: true })
        .returning(),
  );

  return { owner, admin };
}

async function seedOwnerUser(db: Db, tenantId: string, ownerRoleId: string) {
  const passwordHash = await hash(DEV_PASSWORD);

  const user = await findOrInsert(
    () =>
      db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.email, "owner@demo.local"))),
    () =>
      db
        .insert(usersTable)
        .values({
          tenantId,
          email: "owner@demo.local",
          passwordHash,
          dataScopeType: "TENANT",
          mustChangePassword: true,
        })
        .returning(),
  );

  await findOrInsert(
    () =>
      db
        .select()
        .from(userRolesTable)
        .where(and(eq(userRolesTable.userId, user.id), eq(userRolesTable.roleId, ownerRoleId))),
    () =>
      db
        .insert(userRolesTable)
        .values({ tenantId, userId: user.id, roleId: ownerRoleId })
        .returning(),
  );

  return user;
}

async function seedPlatformAdmin(db: Db) {
  const passwordHash = await hash(DEV_PASSWORD);

  return findOrInsert(
    () => db.select().from(platformAdminsTable).where(eq(platformAdminsTable.email, "platform-admin@edtech.local")),
    () =>
      db
        .insert(platformAdminsTable)
        .values({ email: "platform-admin@edtech.local", passwordHash })
        .returning(),
  );
}

async function seed() {
  const db = createDatabaseClient(process.env.DATABASE_MIGRATE_URL);

  const tenant = await seedTenant(db);
  await seedBranches(db, tenant.id);
  await seedModuleEntitlements(db, tenant.id);
  const { owner } = await seedRoles(db, tenant.id);
  await seedOwnerUser(db, tenant.id, owner.id);
  await seedPlatformAdmin(db);

  console.log(`database seed complete (dev password: ${DEV_PASSWORD})`);
}

void seed();
