import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

// Opts a route out of TenantGuard (health, login, provisioning, platform
// admin). The default is guarded — this must be explicit per route.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
