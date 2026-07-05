import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("EdTech SaaS API")
    .setDescription("Operator API for Vietnam-focused education center SaaS.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addServer("/api")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document);

  app
    .getHttpAdapter()
    .get("/api/openapi.json", (_request: unknown, response: { json: (body: unknown) => void }) => {
      response.json(document);
    });
}
