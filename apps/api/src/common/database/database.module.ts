import { Global, Module } from "@nestjs/common";
import { dbProvider } from "./db.provider";
import { platformDbProvider, PLATFORM_DB } from "./db.platform";
import { Database } from "./database.service";

@Global()
@Module({
  providers: [dbProvider, platformDbProvider, Database],
  exports: [Database, PLATFORM_DB],
})
export class DatabaseModule {}
