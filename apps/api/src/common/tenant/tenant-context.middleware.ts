import { Injectable, type NestMiddleware } from "@nestjs/common";
import { TenantContext, type TenantScope } from "./tenant-context";

// Set by jwt-auth.middleware.ts from a verified access token — never from a raw
// client header or query param (04-tenancy-and-data-scope.md §5 rule 1). Carries
// identity only; roles/permissions/scope are resolved from the DB per request
// (09-auth §4.5), not read off the token.
export interface AuthClaims {
  tenantId: string;
  userId: string;
}

interface RequestWithAuth {
  auth?: AuthClaims;
}

type NextFunction = () => void;

// req.auth only carries ids until the authz resolver (auth-rbac plan step 5)
// resolves real roles/branch scope — until then, branchIds/roles stay empty
// ("no scope granted yet"). That fails closed for anything that checks them
// (PermissionsGuard, applyBranchScope — matching TenantGuard/RLS already
// failing closed by default) without blocking tenant-scoped DB access itself,
// since Database.run only needs tenantId.
export function tenantContextMiddleware(
  request: RequestWithAuth,
  _response: unknown,
  next: NextFunction,
) {
  if (!request.auth) {
    next();
    return;
  }

  const scope: TenantScope = {
    tenantId: request.auth.tenantId,
    userId: request.auth.userId,
    branchIds: [],
    roles: [],
  };

  TenantContext.run(scope, next);
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(request: RequestWithAuth, response: unknown, next: NextFunction) {
    tenantContextMiddleware(request, response, next);
  }
}
