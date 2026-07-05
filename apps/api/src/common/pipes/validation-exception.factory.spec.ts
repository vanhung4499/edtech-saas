import type { ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";
import { createValidationException } from "./validation-exception.factory";

describe("createValidationException", () => {
  it("converts class-validator errors to AppException field details", () => {
    const errors: ValidationError[] = [
      {
        property: "email",
        constraints: {
          isEmail: "email must be an email",
        },
      },
      {
        property: "profile",
        children: [
          {
            property: "name",
            constraints: {
              isNotEmpty: "name should not be empty",
            },
          },
        ],
      },
    ];

    const exception = createValidationException(errors);

    expect(exception.getStatus()).toBe(400);
    expect(exception.getAppResponse()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      data: {
        fields: [
          { field: "email", message: "email must be an email" },
          { field: "profile.name", message: "name should not be empty" },
        ],
      },
    });
  });
});
