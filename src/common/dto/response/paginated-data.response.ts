import { ApiProperty } from '@nestjs/swagger';
import { ResponseStatus } from '../../enums';

export interface IPagingMeta {
  total: number;
  lastPage: number;
  currentPage: number;
  perPage: number;
  prev: number | null;
  next: number | null;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: IPagingMeta;
}

export class PagingMeta implements IPagingMeta {
  @ApiProperty({ type: Number })
  total: number;

  @ApiProperty({ type: Number })
  lastPage: number;

  @ApiProperty({ type: Number })
  currentPage: number;

  @ApiProperty({ type: Number })
  perPage: number;

  @ApiProperty({ type: Number, nullable: true })
  prev: number | null;

  @ApiProperty({ type: Number, nullable: true })
  next: number | null;
}

export class PagingDataResponse<T> implements IPaginatedResult<T> {
  @ApiProperty()
  status: string;

  data: T[];

  meta: PagingMeta;

  constructor(data: T[], meta: PagingMeta) {
    this.status = ResponseStatus.SUCCESS;
    this.data = data;
    this.meta = meta;
  }
}
