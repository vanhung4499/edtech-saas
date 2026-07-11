import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/**
 * Worker entrypoint — boots the same NestJS app WITHOUT the HTTP server, using
 * an application context. BullMQ `@Processor` providers registered in feature
 * modules start consuming here.
 *
 * Phase 1 runs jobs in-process via `main.ts` (one deployable). This entrypoint
 * exists so workers can be split into their own process later without
 * restructuring code — see `docs/technical/10-cross-cutting-conventions.md`.
 * When that split happens, an env flag disables in-process consumption in
 * `main.ts` so processors do not run twice.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  app.enableShutdownHooks();
}

void bootstrap();
