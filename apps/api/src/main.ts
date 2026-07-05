import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { AppExceptionFilter } from "./common/exceptions/app-exception.filter.js";
import { setupOpenApi } from "./common/openapi/setup-openapi.js";
import { createValidationException } from "./common/pipes/validation-exception.factory.js";
import { requestIdMiddleware } from "./common/request/request-id.middleware.js";
import { ResultInterceptor } from "./common/result/result.interceptor.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.APP_URL ?? "http://localhost:3000",
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
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap();
