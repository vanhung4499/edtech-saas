import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiProperty, ApiTags } from "@nestjs/swagger";

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
  @ApiOkResponse({ type: HealthResponse })
  getHealth() {
    return {
      status: "ok",
      service: "api",
    };
  }
}
