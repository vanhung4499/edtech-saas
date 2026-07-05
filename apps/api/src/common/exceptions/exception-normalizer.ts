import { HttpException, HttpStatus } from "@nestjs/common";
import type { ResultBody } from "../result/result.js";
import { AppException } from "./app.exception.js";

export interface NormalizedException {
  status: number;
  body: ResultBody;
}

const httpStatusCodeMap: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_SERVER_ERROR",
};

export function normalizeException(exception: unknown): NormalizedException {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      body: exception.getAppResponse(),
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      body: {
        code: httpStatusCodeMap[status] ?? "HTTP_ERROR",
        message: extractHttpExceptionMessage(exception),
        data: null,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      data: null,
    },
  };
}

function extractHttpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null && "message" in response) {
    const message = (response as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join("; ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return exception.message || "Request failed";
}
