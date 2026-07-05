import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/exceptions/app-exception.filter";
import { setupOpenApi } from "./common/openapi/setup-openapi";
import { createValidationException } from "./common/pipes/validation-exception.factory";
import { requestIdMiddleware } from "./common/request/request-id.middleware";
import { ResultInterceptor } from "./common/result/result.interceptor";
import type { ServerEnv } from "./config/server-env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<ServerEnv, true>>(ConfigService);
  const appUrl = config.get("APP_URL", { infer: true });
  const port = config.get("PORT", { infer: true });

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: appUrl,
    credentials: true,
  });
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalInterceptors(new ResultInterceptor());
  setupOpenApi(app);
  await app.listen(port);
}

void bootstrap();
