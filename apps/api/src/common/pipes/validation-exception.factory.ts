import type { ValidationError } from "class-validator";
import { AppException } from "../exceptions/app.exception";
import { CommonErrorCode } from "../exceptions/common-error-code";

interface ValidationFieldError {
  field: string;
  message: string;
}

export function createValidationException(errors: ValidationError[]) {
  return new AppException(CommonErrorCode.VALIDATION_ERROR, {
    fields: flattenValidationErrors(errors),
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
