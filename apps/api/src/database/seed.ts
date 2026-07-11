import { createDatabaseClient, tenantsTable } from "./index";

async function seed() {
  const db = createDatabaseClient(process.env.DATABASE_MIGRATE_URL);

  await db
    .insert(tenantsTable)
    .values({
      name: "Demo Education Center",
      code: "demo",
    })
    .onConflictDoNothing();

  console.log("database seed complete");
}

void seed();
