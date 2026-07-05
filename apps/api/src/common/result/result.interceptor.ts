import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";
import {
  RESULT_SUCCESS_CODE,
  RESULT_SUCCESS_MESSAGE,
  isResultBody,
  type ResultEnvelope,
} from "./result";

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResultEnvelope> {
    const request = context.switchToHttp().getRequest<{ traceId?: string }>();
    const traceId = request.traceId ?? "";

    return next.handle().pipe(
      map((payload: unknown) => {
        if (isResultBody(payload)) {
          return {
            ...payload,
            traceId,
          };
        }

        return {
          code: RESULT_SUCCESS_CODE,
          message: RESULT_SUCCESS_MESSAGE,
          data: payload ?? null,
          traceId,
        };
      }),
    );
  }
}
