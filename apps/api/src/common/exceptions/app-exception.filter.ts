import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { normalizeException } from "./exception-normalizer";

interface HttpResponseLike {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

interface HttpRequestLike {
  traceId?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponseLike>();
    const request = http.getRequest<HttpRequestLike>();
    const normalized = normalizeException(exception);

    if (normalized.status >= 500) {
      const route = `${request.method ?? ""} ${request.originalUrl ?? request.url ?? ""}`.trim();
      this.logger.error(
        `traceId=${request.traceId ?? ""} ${route} ${normalized.body.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(normalized.status).json({
      ...normalized.body,
      traceId: request.traceId ?? "",
    });
  }
}
