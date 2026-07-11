export interface ResultBody<TData = unknown> {
  code: string;
  message: string;
  data: TData;
}
