import type { HttpStatus } from "@nestjs/common";

export interface ErrorCode {
  code: string;
  message: string;
  status: HttpStatus;
}

// Derives `code` from each entry's key so it can never drift from or duplicate another.
export function defineErrorCodes<T extends Record<string, Omit<ErrorCode, "code">>>(
  codes: T,
): { [K in keyof T]: ErrorCode & { code: K } } {
  return Object.fromEntries(
    Object.entries(codes).map(([key, value]) => [key, { ...value, code: key }]),
  ) as { [K in keyof T]: ErrorCode & { code: K } };
}
