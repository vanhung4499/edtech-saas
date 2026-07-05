import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { parseServerEnv } from "./config/server-env";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env.local", "../../.env", ".env.local", ".env"],
      validate: parseServerEnv,
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
