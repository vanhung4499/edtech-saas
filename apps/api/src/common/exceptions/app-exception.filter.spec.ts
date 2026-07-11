import { Logger, NotFoundException, type ArgumentsHost } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppExceptionFilter } from "./app-exception.filter";

function createHost(request: unknown) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe("AppExceptionFilter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the stack trace for unexpected 5xx errors", () => {
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const filter = new AppExceptionFilter();
    const { host, status, json } = createHost({
      traceId: "trace-1",
      method: "GET",
      originalUrl: "/api/v1/boom",
    });

    filter.catch(new Error("db exploded"), host);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain("trace-1");
    expect(errorSpy.mock.calls[0]?.[0]).toContain("GET /api/v1/boom");
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      data: null,
      traceId: "trace-1",
    });
  });

  it("does not log expected 4xx business errors", () => {
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const filter = new AppExceptionFilter();
    const { host } = createHost({ traceId: "trace-2" });

    filter.catch(new NotFoundException("missing"), host);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("still logs a readable detail when a non-Error value is thrown", () => {
    const errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const filter = new AppExceptionFilter();
    const { host } = createHost({ traceId: "trace-3" });

    filter.catch("raw string failure", host);

    expect(errorSpy).toHaveBeenCalledWith(expect.any(String), "raw string failure");
  });
});
