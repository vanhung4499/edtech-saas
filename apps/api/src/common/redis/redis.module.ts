import { Global, Module } from "@nestjs/common";
import { redisProvider } from "./redis.provider";

// Exports the raw client (unlike DatabaseModule, which only exports the
// tenant-bound Database wrapper): Redis usage here is already namespaced by
// key convention (session:*, user-sessions:*, later authz:*) rather than
// needing a scoping wrapper the way Postgres needs withTenant for RLS.
@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
