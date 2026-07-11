import { HttpStatus } from "@nestjs/common";
import { defineErrorCodes } from "./error-code";

export const CommonErrorCode = defineErrorCodes({
  VALIDATION_ERROR: {
    message: "Validation failed",
    status: HttpStatus.BAD_REQUEST,
  },
});
