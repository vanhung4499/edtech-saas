import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./common/exceptions/app-exception.filter";
import { setupOpenApi } from "./common/openapi/setup-openapi";
import { createValidationException } from "./common/pipes/validation-exception.factory";
import { requestIdMiddleware } from "./common/request/request-id.middleware";
import { ResultInterceptor } from "./common/result/result.interceptor";

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
