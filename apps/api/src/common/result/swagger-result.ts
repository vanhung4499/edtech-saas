import { applyDecorators, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { RESULT_SUCCESS_CODE, RESULT_SUCCESS_MESSAGE } from "./result.js";

export class ResultDto<TData = unknown> {
  @ApiProperty({ example: RESULT_SUCCESS_CODE })
  code!: string;

  @ApiProperty({ example: RESULT_SUCCESS_MESSAGE })
  message!: string;

  @ApiProperty({ nullable: true })
  data!: TData;

  @ApiProperty({ example: "req_01HZY8M4N7Y4Q8H6V5F6D7A8B9" })
  traceId!: string;
}

export function ApiResult<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(ResultDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResultDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}
