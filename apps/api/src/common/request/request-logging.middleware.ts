import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";

interface RequestLike {
  method: string;
  originalUrl?: string;
  url: string;
  traceId?: string;
}

interface ResponseLike {
  statusCode: number;
  on: (event: "finish", listener: () => void) => void;
}

type NextFunction = () => void;

const logger = new Logger("HTTP");

export function requestLoggingMiddleware(
  request: RequestLike,
  response: ResponseLike,
  next: NextFunction,
) {
  const startedAt = Date.now();

  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const line = `${request.method} ${request.originalUrl ?? request.url} ${response.statusCode} ${durationMs}ms traceId=${request.traceId ?? ""}`;

    if (response.statusCode >= 500) {
      logger.error(line);
    } else {
      logger.log(line);
    }
  });

  next();
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(request: RequestLike, response: ResponseLike, next: NextFunction) {
    requestLoggingMiddleware(request, response, next);
  }
}
