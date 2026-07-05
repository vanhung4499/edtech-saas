import { Controller, Get } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { ApiResult } from "./common/result/swagger-result";

class HealthResponse {
  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "api" })
  service!: string;
}

@Controller("health")
@ApiTags("Health")
export class HealthController {
  @Get()
  @ApiResult(HealthResponse)
  getHealth() {
    return {
      status: "ok",
      service: "api",
    };
  }
}
