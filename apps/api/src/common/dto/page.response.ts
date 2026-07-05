import { ApiProperty } from "@nestjs/swagger";

export class PageMetaResponse {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 125 })
  total!: number;
}

export class PageResponse<TItem> {
  @ApiProperty({ isArray: true })
  items!: TItem[];

  @ApiProperty({ type: PageMetaResponse })
  meta!: PageMetaResponse;
}
