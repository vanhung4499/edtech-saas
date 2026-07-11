import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppException } from "../exceptions/app.exception";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { TenantContext } from "./tenant-context";
import { TenantErrorCode } from "./tenant.errors";

// Global guard, fail closed: every route requires tenant context unless it
// opts out with @Public() (04-tenancy-and-data-scope.md §5 rule 3).
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!TenantContext.current()) {
      throw new AppException(TenantErrorCode.TENANT_CONTEXT_REQUIRED);
    }

    return true;
  }
}
