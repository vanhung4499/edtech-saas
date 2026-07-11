import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Public } from "./common/tenant/public.decorator";

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
  @Public()
  @ApiOkResponse({ type: HealthResponse })
  getHealth() {
    return {
      status: "ok",
      service: "api",
    };
  }
}
