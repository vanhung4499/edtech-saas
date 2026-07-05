import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { ResultInterceptor } from "./result.interceptor";

function createContext(traceId = "req-test"): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ traceId }),
    }),
  } as ExecutionContext;
}

function createCallHandler(value: unknown): CallHandler {
  return {
    handle: () => of(value),
  };
}

describe("ResultInterceptor", () => {
  it("wraps successful data with code, message, data, and traceId", async () => {
    const interceptor = new ResultInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(createContext("req-123"), createCallHandler({ id: "tenant-1" })),
    );

    expect(result).toEqual({
      code: "SUCCESS",
      message: "Success",
      data: { id: "tenant-1" },
      traceId: "req-123",
    });
  });

  it("keeps explicit response code and message when handler returns a Result body", async () => {
    const interceptor = new ResultInterceptor();

    const result = await lastValueFrom(
      interceptor.intercept(
        createContext("req-456"),
        createCallHandler({
          code: "TENANT_CREATED",
          message: "Tenant created",
          data: { id: "tenant-2" },
        }),
      ),
    );

    expect(result).toEqual({
      code: "TENANT_CREATED",
      message: "Tenant created",
      data: { id: "tenant-2" },
      traceId: "req-456",
    });
  });
});
