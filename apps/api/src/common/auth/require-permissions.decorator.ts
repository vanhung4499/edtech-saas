import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "./permissions";

export const PERMISSIONS_KEY = "requiredPermissions";

// Metadata only at this step — PermissionsGuard (auth-rbac plan step 5) reads
// it to enforce entitlement + permission. Every route needs this or @Public();
// a route-metadata conformance test (step 5) fails closed on routes with
// neither. Typed against PermissionKey, not string, so a typo'd key is a
// compile error, not a silent always-false check at runtime.
export const RequirePermissions = (...keys: PermissionKey[]) => SetMetadata(PERMISSIONS_KEY, keys);
