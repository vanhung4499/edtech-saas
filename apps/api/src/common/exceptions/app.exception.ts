import { HttpException } from "@nestjs/common";
import type { ResultBody } from "../result/result";
import type { ErrorCode } from "./error-code";

export class AppException<TData = unknown> extends HttpException {
  private readonly resultBody: ResultBody<TData | null>;

  constructor(errorCode: ErrorCode, data?: TData) {
    const response = {
      code: errorCode.code,
      message: errorCode.message,
      data: data ?? null,
    };

    super(response, errorCode.status);
    this.resultBody = response;
  }

  getAppResponse(): ResultBody<TData | null> {
    return this.resultBody;
  }
}
