import { HttpStatus } from "@nestjs/common";
import { defineErrorCodes } from "../exceptions/error-code";

export const TenantErrorCode = defineErrorCodes({
  TENANT_CONTEXT_REQUIRED: {
    message: "Tenant context is required",
    status: HttpStatus.UNAUTHORIZED,
  },
});
