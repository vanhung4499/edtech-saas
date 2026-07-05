import { BadRequestException, HttpStatus, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppException } from "./app.exception.js";
import { normalizeException } from "./exception-normalizer.js";

describe("AppException", () => {
  it("keeps business code, message, status, and data", () => {
    const exception = new AppException({
      code: "USER_NOT_FOUND",
      message: "User not found",
      status: HttpStatus.NOT_FOUND,
      data: { id: "user-1" },
    });

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getAppResponse()).toEqual({
      code: "USER_NOT_FOUND",
      message: "User not found",
      data: { id: "user-1" },
    });
  });

  it("provides named factories for common business HTTP statuses", () => {
    expect(AppException.notFound("USER_NOT_FOUND", "User not found").getStatus()).toBe(
      HttpStatus.NOT_FOUND,
    );
    expect(AppException.badRequest("INVALID_INPUT", "Invalid input").getStatus()).toBe(
      HttpStatus.BAD_REQUEST,
    );
    expect(AppException.conflict("USER_ALREADY_EXISTS", "User already exists").getStatus()).toBe(
      HttpStatus.CONFLICT,
    );
    expect(AppException.forbidden("NO_PERMISSION", "No permission").getStatus()).toBe(
      HttpStatus.FORBIDDEN,
    );
    expect(AppException.unauthorized("LOGIN_REQUIRED", "Login required").getStatus()).toBe(
      HttpStatus.UNAUTHORIZED,
    );
  });

  it("maps Nest HTTP exceptions to the common error shape", () => {
    const normalized = normalizeException(new NotFoundException("Route not found"));

    expect(normalized).toEqual({
      status: HttpStatus.NOT_FOUND,
      body: {
        code: "NOT_FOUND",
        message: "Route not found",
        data: null,
      },
    });
  });

  it("maps validation-style bad requests without leaking Nest response internals", () => {
    const normalized = normalizeException(
      new BadRequestException({
        message: ["email must be an email", "name should not be empty"],
        error: "Bad Request",
        statusCode: 400,
      }),
    );

    expect(normalized).toEqual({
      status: HttpStatus.BAD_REQUEST,
      body: {
        code: "BAD_REQUEST",
        message: "email must be an email; name should not be empty",
        data: null,
      },
    });
  });

  it("hides unknown exception details behind internal server error", () => {
    const normalized = normalizeException(new Error("database password leaked"));

    expect(normalized).toEqual({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        data: null,
      },
    });
  });
});
