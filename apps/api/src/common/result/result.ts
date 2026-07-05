export const RESULT_SUCCESS_CODE = "SUCCESS";
export const RESULT_SUCCESS_MESSAGE = "Success";

export interface ResultEnvelope<TData = unknown> {
  code: string;
  message: string;
  data: TData;
  traceId: string;
}

export interface ResultBody<TData = unknown> {
  code: string;
  message: string;
  data: TData;
}

export function isResultBody(value: unknown): value is ResultBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "data" in value &&
    typeof (value as ResultBody).code === "string" &&
    typeof (value as ResultBody).message === "string"
  );
}
