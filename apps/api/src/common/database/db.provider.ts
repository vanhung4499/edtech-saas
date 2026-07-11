import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ServerEnv } from "../../config/server-env";
import { createDatabaseClient, type Db } from "../../database";

export const DB = Symbol("DB");

export const dbProvider: Provider = {
  provide: DB,
  useFactory: (config: ConfigService<ServerEnv, true>): Db =>
    createDatabaseClient(config.get("DATABASE_URL", { infer: true })),
  inject: [ConfigService],
};
