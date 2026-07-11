import { createDatabaseClient, tenantsTable } from "./index";

async function seed() {
  const db = createDatabaseClient();

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
