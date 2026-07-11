import { Global, Module } from "@nestjs/common";
import { SessionStore } from "./session.store";

// Depends on RedisModule's REDIS token — no explicit import needed since
// RedisModule is @Global(), but it must be registered somewhere in the app
// (AppModule) for that token to resolve.
@Global()
@Module({
  providers: [SessionStore],
  exports: [SessionStore],
})
export class AuthInfrastructureModule {}
