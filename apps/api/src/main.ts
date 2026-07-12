import "reflect-metadata";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createJwtAuthMiddleware } from "./common/auth/jwt-auth.middleware";
import { TokenService } from "./common/auth/token.service";
import { AppExceptionFilter } from "./common/exceptions/app-exception.filter";
import { setupOpenApi } from "./common/openapi/setup-openapi";
import { createValidationException } from "./common/pipes/validation-exception.factory";
import { requestIdMiddleware } from "./common/request/request-id.middleware";
import { requestLoggingMiddleware } from "./common/request/request-logging.middleware";
import { tenantContextMiddleware } from "./common/tenant/tenant-context.middleware";
import type { ServerEnv } from "./config/server-env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<ServerEnv, true>>(ConfigService);
  const appUrl = config.get("APP_URL", { infer: true });
  const port = config.get("PORT", { infer: true });
  const tokenService = app.get(TokenService);

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  // Bearer-token auth carries no cookies, so no credentials mode / CSRF concern
  // — CORS just needs to allow the web app's origin and its Authorization header.
  app.enableCors({ origin: appUrl });
  // Pipeline order matches 09-auth-and-authorization.md §4.4: requestId ->
  // jwtAuth (Bearer -> req.auth) -> tenant context -> request logging.
  app.use(requestIdMiddleware);
  app.use(createJwtAuthMiddleware(tokenService));
  app.use(tenantContextMiddleware);
  app.use(requestLoggingMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
  setupOpenApi(app);
  await app.listen(port);
}

void bootstrap();
