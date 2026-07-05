import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { normalizeException } from "./exception-normalizer";

interface HttpResponseLike {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponseLike>();
    const request = http.getRequest<{ traceId?: string }>();
    const normalized = normalizeException(exception);

    response.status(normalized.status).json({
      ...normalized.body,
      traceId: request.traceId ?? "",
    });
  }
}
