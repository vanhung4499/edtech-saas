import { Global, Module } from "@nestjs/common";
import { dbProvider } from "./db.provider";
import { Database } from "./database.service";

@Global()
@Module({
  providers: [dbProvider, Database],
  exports: [Database],
})
export class DatabaseModule {}
