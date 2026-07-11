import { uuid } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

// UUIDv7 (time-ordered) generated app-side, not gen_random_uuid() (v4) —
// keeps insert locality without the enumeration risk of an auto-increment PK.
export function idColumn() {
  return uuid("id").primaryKey().$defaultFn(() => uuidv7());
}
