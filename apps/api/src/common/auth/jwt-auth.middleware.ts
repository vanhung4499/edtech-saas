import type { AuthClaims } from "../tenant/tenant-context.middleware";
import type { TokenService } from "./token.service";

const BEARER_PREFIX = "Bearer ";

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  auth?: AuthClaims;
}

type NextFunction = () => void;

// Factory closing over the DI-resolved TokenService (like the other app.use()
// middleware) — call once at bootstrap with app.get(TokenService). Reads the
// `Authorization: Bearer` access token, verifies it, and sets req.auth for
// tenantContextMiddleware to turn into a TenantContext.
//
// A missing/invalid/expired token just leaves req.auth unset — the guards
// (TenantGuard, later PermissionsGuard) fail closed with 401/403. Verification
// never throws (TokenService swallows errors and returns null), so this
// app.use() middleware — which runs outside Nest's exception-filter pipeline —
// can never leak an error to the client.
export function createJwtAuthMiddleware(tokenService: TokenService) {
  return function jwtAuthMiddleware(
    request: RequestWithAuth,
    _response: unknown,
    next: NextFunction,
  ) {
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;

    if (value?.startsWith(BEARER_PREFIX)) {
      const identity = tokenService.verifyAccessToken(value.slice(BEARER_PREFIX.length).trim());

      if (identity) {
        request.auth = { userId: identity.userId, tenantId: identity.tenantId };
      }
    }

    next();
  };
}
