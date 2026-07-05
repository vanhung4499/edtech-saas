import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class IdParamRequest {
  @ApiProperty({ example: "0190f7ec-7b72-7b6c-9f62-74a504b5f6f8" })
  @IsUUID()
  id!: string;
}
