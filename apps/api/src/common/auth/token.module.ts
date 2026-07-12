import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { ServerEnv } from "../../config/server-env";
import { TokenService } from "./token.service";

// @Global so TokenService is injectable anywhere (the login controller in
// modules/system/auth, and app.get(TokenService) for the bootstrap middleware)
// without re-importing. JwtModule is configured once here with AUTH_SECRET as
// the HS256 signing key (09-auth §3.2); the secret never leaves the server.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ServerEnv, true>) => ({
        secret: config.get("AUTH_SECRET", { infer: true }),
      }),
    }),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
