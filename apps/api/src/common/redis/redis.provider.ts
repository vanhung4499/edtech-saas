import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { ServerEnv } from "../../config/server-env";

export const REDIS = Symbol("REDIS");

export const redisProvider: Provider = {
  provide: REDIS,
  useFactory: (config: ConfigService<ServerEnv, true>): Redis =>
    new Redis(config.get("REDIS_URL", { infer: true })),
  inject: [ConfigService],
};
