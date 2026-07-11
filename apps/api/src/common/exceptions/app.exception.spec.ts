import { BadRequestException, HttpStatus, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppException } from "./app.exception";
import { defineErrorCodes } from "./error-code";
import { normalizeException } from "./exception-normalizer";

// Stand-in for a module-local error code registry, e.g. `modules/system/user/user.errors.ts`.
const UserErrorCode = defineErrorCodes({
  USER_NOT_FOUND: {
    message: "User not found",
    status: HttpStatus.NOT_FOUND,
  },
  USER_ALREADY_EXISTS: {
    message: "User already exists",
    status: HttpStatus.CONFLICT,
  },
});

describe("AppException", () => {
  it("keeps business code, message, status, and data from the error code", () => {
    const exception = new AppException(UserErrorCode.USER_NOT_FOUND, { id: "user-1" });

    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getAppResponse()).toEqual({
      code: "USER_NOT_FOUND",
      message: "User not found",
      data: { id: "user-1" },
    });
  });

  it("defaults data to null when not provided", () => {
    const exception = new AppException(UserErrorCode.USER_NOT_FOUND);

    expect(exception.getAppResponse().data).toBeNull();
  });

  it("carries whichever HTTP status the error code declares", () => {
    expect(new AppException(UserErrorCode.USER_NOT_FOUND).getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(new AppException(UserErrorCode.USER_ALREADY_EXISTS).getStatus()).toBe(
      HttpStatus.CONFLICT,
    );
  });

  it("derives each error code's `code` from its registry key", () => {
    expect(UserErrorCode.USER_NOT_FOUND.code).toBe("USER_NOT_FOUND");
    expect(UserErrorCode.USER_ALREADY_EXISTS.code).toBe("USER_ALREADY_EXISTS");
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
