import { ApiProperty } from '@nestjs/swagger';
import { ResponseStatus } from '../../enums';

interface IDataResponse {
  status: string;
  data: any;
}

export class DataResponse<T> implements IDataResponse {
  @ApiProperty()
  status: string;

  data: T;

  constructor(data: T) {
    this.status = ResponseStatus.SUCCESS;
    this.data = data;
  }
}

export class DataArrayResponse<T> implements IDataResponse {
  @ApiProperty()
  status: string;

  data: T[];

  @ApiProperty({ type: Number })
  totalResults: number;

  constructor(data: T[]) {
    this.status = ResponseStatus.SUCCESS;
    this.data = data;
    this.totalResults = data.length;
  }
}
