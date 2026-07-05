import { HttpException, type HttpStatus } from "@nestjs/common";
import type { ResultBody } from "../result/result";

export interface AppExceptionOptions<TData = unknown> {
  code: string;
  message: string;
  status: HttpStatus;
  data?: TData;
}

export class AppException<TData = unknown> extends HttpException {
  private readonly resultBody: ResultBody<TData | null>;

  constructor(options: AppExceptionOptions<TData>) {
    const response = {
      code: options.code,
      message: options.message,
      data: options.data ?? null,
    };

    super(response, options.status);
    this.resultBody = response;
  }

  getAppResponse(): ResultBody<TData | null> {
    return this.resultBody;
  }

  static badRequest<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 400, data });
  }

  static unauthorized<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 401, data });
  }

  static forbidden<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 403, data });
  }

  static notFound<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 404, data });
  }

  static conflict<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 409, data });
  }

  static unprocessable<TData = unknown>(code: string, message: string, data?: TData) {
    return new AppException({ code, message, status: 422, data });
  }
}
