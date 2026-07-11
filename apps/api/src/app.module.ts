import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./common/database/database.module";
import { TenantGuard } from "./common/tenant/tenant.guard";
import { parseServerEnv } from "./config/server-env";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ["../../.env.local", "../../.env", ".env.local", ".env"],
      validate: parseServerEnv,
    }),
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: TenantGuard }],
})
export class AppModule {}
