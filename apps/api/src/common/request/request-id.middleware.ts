import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  traceId?: string;
}

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

type NextFunction = () => void;

export function requestIdMiddleware(
  request: RequestLike,
  response: ResponseLike,
  next: NextFunction,
) {
  const incomingRequestId = request.headers["x-request-id"];
  const traceId = Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId;

  request.traceId = traceId || randomUUID();
  response.setHeader("x-request-id", request.traceId);
  next();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestLike, response: ResponseLike, next: NextFunction) {
    requestIdMiddleware(request, response, next);
  }
}
