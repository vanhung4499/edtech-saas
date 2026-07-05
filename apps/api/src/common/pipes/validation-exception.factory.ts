import { HttpStatus } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { AppException } from "../exceptions/app.exception.js";

interface ValidationFieldError {
  field: string;
  message: string;
}

export function createValidationException(errors: ValidationError[]) {
  return new AppException({
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    status: HttpStatus.BAD_REQUEST,
    data: {
      fields: flattenValidationErrors(errors),
    },
  });
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = "",
): ValidationFieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const currentErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    const childErrors = flattenValidationErrors(error.children ?? [], field);

    return [...currentErrors, ...childErrors];
  });
}
