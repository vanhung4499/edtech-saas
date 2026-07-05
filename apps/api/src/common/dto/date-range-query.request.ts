import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

export class DateRangeQueryRequest {
  @ApiPropertyOptional({ example: "2026-07-01" })
  @IsOptional()
  @IsISO8601({ strict: true })
  fromDate?: string;

  @ApiPropertyOptional({ example: "2026-07-31" })
  @IsOptional()
  @IsISO8601({ strict: true })
  toDate?: string;
}
