import { Injectable, type NestMiddleware } from "@nestjs/common";
import { TenantContext, type TenantScope } from "./tenant-context";

// Populated by the (not yet built) auth layer from a verified token — never
// from a raw client header or query param (04-tenancy-and-data-scope.md §5
// rule 1). No dev fallback: a temporary header-based tenant id would outlive
// its welcome.
export interface AuthClaims {
  tenantId: string;
  userId: string;
  branchIds: string[] | "ALL";
  roles: string[];
}

interface RequestWithAuth {
  auth?: AuthClaims;
}

type NextFunction = () => void;

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
    branchIds: request.auth.branchIds,
    roles: request.auth.roles,
  };

  TenantContext.run(scope, next);
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(request: RequestWithAuth, response: unknown, next: NextFunction) {
    tenantContextMiddleware(request, response, next);
  }
}
