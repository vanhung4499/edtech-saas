import { Logger } from "@nestjs/common";
import type { SessionStore } from "./session.store";

export const SESSION_COOKIE_NAME = "edtech_session";

const logger = new Logger("SessionMiddleware");

interface RequestWithSession {
  signedCookies?: Record<string, string | false>;
  auth?: { userId: string; tenantId: string };
  traceId?: string;
}

interface ResponseWithCookies {
  clearCookie: (name: string) => void;
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

type NextFunction = () => void;

// Needs the DI-managed SessionStore singleton (shared with whatever else
// injects it, e.g. the future login/logout endpoints), so this is built as a
// factory closing over it — call once at bootstrap with app.get(SessionStore)
// — rather than a plain top-level function like the other app.use()
// middleware, which don't need a DI-resolved dependency.
export function createSessionMiddleware(sessionStore: SessionStore) {
  return async function sessionMiddleware(
    request: RequestWithSession,
    response: ResponseWithCookies,
    next: NextFunction,
  ) {
    const sessionId = request.signedCookies?.[SESSION_COOKIE_NAME];

    // Absent (no cookie) and `false` (present but failed signature check —
    // cookie-parser's convention for a tampered signed cookie) both mean "no
    // session", but only the latter has a cookie worth clearing.
    if (!sessionId) {
      if (sessionId === false) {
        response.clearCookie(SESSION_COOKIE_NAME);
      }
      next();
      return;
    }

    let data;

    try {
      data = await sessionStore.touch(sessionId);
    } catch (error) {
      // Runs as plain app.use() middleware, outside Nest's exception-filter
      // pipeline — confirmed empirically that an uncaught error here reaches
      // Express's own default error handler instead of AppExceptionFilter,
      // leaking the raw error message to the client (a corrupted session
      // value's JSON.parse error came through verbatim before this existed).
      // Replicate AppExceptionFilter's safe fallback shape by hand.
      logger.error(
        `traceId=${request.traceId ?? ""} session lookup failed`,
        error instanceof Error ? error.stack : String(error),
      );
      response.status(500).json({
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        data: null,
        traceId: request.traceId ?? "",
      });
      return;
    }

    if (!data) {
      response.clearCookie(SESSION_COOKIE_NAME);
      next();
      return;
    }

    request.auth = { userId: data.userId, tenantId: data.tenantId };
    next();
  };
}
