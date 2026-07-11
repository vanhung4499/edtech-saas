// CSRF baseline for the cookie session model (09-auth-and-authorization.md
// §3.2): Lax cookies already block cross-site POSTs, this adds an explicit
// check. Scoped to this specific auth model — a future token-based
// mobile/API auth path bypasses cookies (and this check) entirely.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface RequestWithOrigin {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  traceId?: string;
}

interface HttpResponseLike {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

type NextFunction = () => void;

// Runs as plain app.use() middleware, outside Nest's exception-filter
// pipeline (that only wraps guards/interceptors/pipes/controllers) — so the
// error envelope is built by hand here to match AppExceptionFilter's shape,
// rather than throwing an AppException nothing downstream would catch.
export function createOriginCheckMiddleware(appUrl: string) {
  return function originCheckMiddleware(
    request: RequestWithOrigin,
    response: HttpResponseLike,
    next: NextFunction,
  ) {
    if (!MUTATING_METHODS.has(request.method)) {
      next();
      return;
    }

    const origin = request.headers.origin;

    if (origin !== appUrl) {
      response.status(403).json({
        code: "ORIGIN_NOT_ALLOWED",
        message: "Request origin is not allowed",
        data: null,
        traceId: request.traceId ?? "",
      });
      return;
    }

    next();
  };
}
